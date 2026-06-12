"use client";

import Link from "next/link";
import { KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CheckCheck,
  ChevronDown,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Loader2,
  Megaphone,
  Menu,
  PackageSearch,
  QrCode,
  Search,
  Settings,
  Store,
  UserCog,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  searchAdmin,
  type AdminNotification,
  type AdminSearchResult,
  type BranchListItem
} from "../lib/api";
import { getAdminSession, getCurrentRoleCode, type StoredAdminSession } from "../lib/auth";
import { createAdminOrderConnection, stopConnection, type AdminOrderRealtimeEvent, type AdminWaiterCallRealtimeEvent } from "../lib/realtime";

const SidebarCollapsedStorageKey = "qrapp.admin.sidebarCollapsed";

type AdminShellProps = {
  active: "dashboard" | "branches" | "menu" | "orders" | "kitchen" | "offers" | "customers" | "campaigns" | "staff" | "reports" | "analytics" | "billing" | "settings";
  branchName?: string;
  branches?: BranchListItem[];
  children: ReactNode;
  onLogout: () => void;
  onSelectedBranchChange?: (branchId: string) => void;
  selectedBranchId?: string;
};

type NavItem = {
  id: AdminShellProps["active"];
  label: string;
  helper: string;
  icon: typeof LayoutDashboard;
  href?: string;
  soon?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", helper: "Overview", icon: LayoutDashboard, href: "/admin/dashboard" },
      { id: "branches", label: "Branches", helper: "Locations", icon: Store, href: "/admin/branches" },
      { id: "menu", label: "Menu", helper: "Items", icon: ChefHat, href: "/admin/menu" },
      { id: "orders", label: "Orders", helper: "Live board", icon: ClipboardList, href: "/admin/orders" },
      { id: "kitchen", label: "Kitchen", helper: "Prep view", icon: ChefHat, href: "/admin/kitchen" },
      { id: "offers", label: "Offers", helper: "Combos", icon: Gift, href: "/admin/offers" }
    ]
  },
  {
    label: "Insights",
    items: [
      { id: "analytics", label: "Analytics", helper: "Reports", icon: BarChart3, href: "/admin/analytics" },
      { id: "customers", label: "Customers", helper: "CRM", icon: Users, href: "/admin/customers" },
      { id: "campaigns", label: "Campaigns", helper: "WhatsApp", icon: Megaphone, href: "/admin/campaigns" },
      { id: "staff", label: "Staff", helper: "Access", icon: UserCog, href: "/admin/staff" },
      { id: "reports", label: "Reports", helper: "History", icon: ClipboardList, href: "/admin/reports" },
      { id: "billing", label: "Billing", helper: "Access", icon: CreditCard, href: "/admin/billing" },
      { id: "settings", label: "Settings", helper: "Controls", icon: Settings, href: "/admin/settings" }
    ]
  }
];

export function AdminShell({
  active,
  branchName = "Main Branch",
  branches = [],
  children,
  onLogout,
  onSelectedBranchChange,
  selectedBranchId = ""
}: AdminShellProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<StoredAdminSession | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const canSelectBranch = branches.length > 0 && Boolean(onSelectedBranchChange);
  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavItem(roleCode, item.id))
    }))
    .filter((group) => group.items.length > 0);
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications]);
  const trimmedSearchQuery = searchQuery.trim();
  const showSearchDropdown = isSearchFocused && trimmedSearchQuery.length >= 2;

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(SidebarCollapsedStorageKey) === "true");
    setRoleCode(getCurrentRoleCode());
    setAdminSession(getAdminSession());
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [selectedBranchId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (trimmedSearchQuery.length < 2) {
      setSearchResults([]);
      setActiveSearchIndex(0);
      setIsSearchLoading(false);
      return;
    }

    let isCurrent = true;
    setIsSearchLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchAdmin(trimmedSearchQuery, selectedBranchId || undefined);
        if (isCurrent) {
          setSearchResults(results);
          setActiveSearchIndex(0);
        }
      } catch {
        if (isCurrent) {
          setSearchResults([]);
        }
      } finally {
        if (isCurrent) {
          setIsSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [selectedBranchId, trimmedSearchQuery]);

  useEffect(() => {
    const connection = createAdminOrderConnection();

    const refreshNotifications = (branchId: string) => {
      if (!selectedBranchId || branchId === selectedBranchId) {
        void loadNotifications();
      }
    };

    connection.on("OrderCreated", (event: AdminOrderRealtimeEvent) => refreshNotifications(event.branchId));
    connection.on("OrderStatusUpdated", (event: AdminOrderRealtimeEvent) => refreshNotifications(event.branchId));
    connection.on("WaiterCallCreated", (event: AdminWaiterCallRealtimeEvent) => refreshNotifications(event.branchId));
    connection.on("WaiterCallStatusUpdated", (event: AdminWaiterCallRealtimeEvent) => refreshNotifications(event.branchId));
    void connection.start().catch(() => undefined);

    return () => {
      void stopConnection(connection);
    };
  }, [selectedBranchId]);

  async function loadNotifications() {
    setIsNotificationLoading(true);
    try {
      setNotifications(await getAdminNotifications(selectedBranchId || undefined));
    } catch {
      setNotifications([]);
    } finally {
      setIsNotificationLoading(false);
    }
  }

  async function openNotification(notification: AdminNotification) {
    setIsNotificationOpen(false);
    if (!notification.isRead) {
      setNotifications((current) => current.map((item) => (item.adminNotificationId === notification.adminNotificationId ? { ...item, isRead: true, readAtUtc: new Date().toISOString() } : item)));
      void markAdminNotificationRead(notification.adminNotificationId).catch(() => loadNotifications());
    }

    router.push(notification.targetUrl);
  }

  async function markAllNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true, readAtUtc: notification.readAtUtc ?? new Date().toISOString() })));
    await markAllAdminNotificationsRead(selectedBranchId || undefined).catch(() => loadNotifications());
  }

  function openSearchResult(result: AdminSearchResult) {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    router.push(result.targetUrl);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSearchDropdown) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((current) => Math.min(current + 1, Math.max(searchResults.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && searchResults[activeSearchIndex]) {
      event.preventDefault();
      openSearchResult(searchResults[activeSearchIndex]);
    } else if (event.key === "Escape") {
      setIsSearchFocused(false);
    }
  }

  return (
    <div className={`min-h-screen bg-background text-on-background lg:grid ${isCollapsed ? "lg:grid-cols-[5.5rem_1fr]" : "lg:grid-cols-[17rem_1fr]"}`}>
      <MobileHeader
        branchName={branchName}
        branches={branches}
        canSelectBranch={canSelectBranch}
        selectedBranchId={selectedBranchId}
        onBranchChange={onSelectedBranchChange}
        onOpen={() => setIsMobileOpen(true)}
      />
      {isMobileOpen ? <div className="fixed inset-0 z-40 bg-primary/45 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileOpen(false)} /> : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-white/10 bg-primary text-white shadow-modal transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          isCollapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
      >
        <div className={`flex h-20 items-center gap-3 border-b border-white/10 px-5 ${isCollapsed ? "lg:justify-center lg:px-3" : ""}`}>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-mint text-primary shadow-sm">
            <QrCode size={22} strokeWidth={2.4} />
          </div>
          <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
            <p className="text-lg font-extrabold leading-tight">Qrave</p>
            <p className="text-xs font-semibold text-white/55">Restaurant operations</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className={`scrollbar-hidden flex-1 overflow-y-auto px-3 py-5 ${isCollapsed ? "lg:px-2" : ""}`}>
          {visibleNavGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className={`mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-white/40 ${isCollapsed ? "lg:text-center lg:text-[0]" : ""}`}>
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavButton key={item.id} item={item} active={item.id === active} collapsed={isCollapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-white/10 p-4 ${isCollapsed ? "lg:px-2" : ""}`}>
          <div className={`mb-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 ${isCollapsed ? "lg:grid lg:h-12 lg:place-items-center lg:p-0" : ""}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? "lg:block" : ""}`}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-lime">
                <Store size={18} />
              </div>
              <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-bold">{branchName}</p>
                <p className="text-[11px] font-semibold text-white/45">Owner workspace</p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            className={`h-11 text-white/75 hover:bg-white/10 hover:text-white ${isCollapsed ? "w-full px-0" : "w-full justify-start"}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={17} />
            <span className={isCollapsed ? "lg:hidden" : ""}>Logout</span>
          </Button>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-outline-variant/70 bg-background/90 px-8 backdrop-blur lg:flex">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Admin panel</p>
            <h2 className="mt-1 text-xl font-extrabold text-on-surface">Restaurant workspace</h2>
          </div>
          <div className="flex items-center gap-3">
            {canSelectBranch ? (
              <TopBranchSelect branches={branches} selectedBranchId={selectedBranchId} onChange={onSelectedBranchChange!} />
            ) : null}
            <div ref={searchRef} className="relative w-[22rem]">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/55" />
              <input
                className="h-11 w-full rounded-xl border border-outline-variant/70 bg-white px-4 pl-10 text-sm outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/25 focus:ring-2 focus:ring-ring/15"
                placeholder="Search branches, orders, menu..."
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
              />
              {showSearchDropdown ? (
                <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded-xl border border-outline-variant/70 bg-white shadow-modal">
                  <div className="border-b border-outline-variant/60 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Search results</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto py-2">
                    {isSearchLoading ? (
                      <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-on-surface-variant">
                        <Loader2 size={16} className="animate-spin" />
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result, index) => (
                        <button
                          key={`${result.typeCode}-${result.entityId}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => openSearchResult(result)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${index === activeSearchIndex ? "bg-primary/5" : "hover:bg-primary/5"}`}
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <SearchResultIcon typeCode={result.typeCode} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-on-surface">{result.title}</p>
                            <p className="truncate text-xs font-semibold text-on-surface-variant">{formatSearchType(result.typeCode)} · {result.subtitle}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <PackageSearch size={24} className="mx-auto text-on-surface-variant/45" />
                        <p className="mt-2 text-sm font-bold text-on-surface">No results found</p>
                        <p className="mt-1 text-xs font-semibold text-on-surface-variant">Try another branch, order, menu item, or offer.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                className="relative grid h-11 w-11 place-items-center rounded-xl border border-outline-variant/70 bg-white text-on-surface-variant transition-colors hover:border-primary/20 hover:text-primary"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-mint px-1 text-[10px] font-extrabold text-primary ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotificationOpen ? (
                <div className="absolute right-0 top-12 z-50 w-[24rem] overflow-hidden rounded-xl border border-outline-variant/70 bg-white shadow-modal">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-on-surface">Notifications</p>
                      <p className="text-xs font-semibold text-on-surface-variant">{unreadCount} unread</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
                      <CheckCheck size={15} />
                      Mark read
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto py-2">
                    {isNotificationLoading ? (
                      <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-on-surface-variant">
                        <Loader2 size={16} className="animate-spin" />
                        Loading...
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <button
                          key={notification.adminNotificationId}
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5 ${notification.isRead ? "" : "bg-brand-mint/10"}`}
                        >
                          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${notification.isRead ? "bg-surface-container text-on-surface-variant" : "bg-brand-mint text-primary"}`}>
                            <NotificationIcon typeCode={notification.typeCode} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold text-on-surface">{notification.title}</p>
                              {!notification.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-mint" /> : null}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-5 text-on-surface-variant">{notification.message}</p>
                            <p className="mt-1 text-[11px] font-bold text-on-surface-variant/70">{formatRelativeTime(notification.createdAtUtc)}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={24} className="mx-auto text-on-surface-variant/45" />
                        <p className="mt-2 text-sm font-bold text-on-surface">No notifications</p>
                        <p className="mt-1 text-xs font-semibold text-on-surface-variant">New orders and waiter calls will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCollapsed((current) => {
                  const next = !current;
                  window.localStorage.setItem(SidebarCollapsedStorageKey, String(next));
                  return next;
                });
              }}
              className="grid h-11 w-11 place-items-center rounded-xl border border-outline-variant/70 bg-white text-on-surface-variant transition-colors hover:border-primary/20 hover:text-primary"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <TenantAccessBanner session={adminSession} />
          {children}
        </main>
      </div>
    </div>
  );
}

function TenantAccessBanner({ session }: { session: StoredAdminSession | null }) {
  const access = session?.tenant.accessStatus;
  if (!access) {
    return null;
  }

  const isEndingSoon = access.subscriptionStatusCode === "Trialing" &&
    access.trialDaysRemaining !== null &&
    access.trialDaysRemaining <= 3;
  if (access.isAccessAllowed && !isEndingSoon) {
    return null;
  }

  return (
    <div
      className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
        access.isAccessAllowed
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>{access.message}</p>
        <span className="text-xs font-bold uppercase tracking-wide opacity-75">
          {access.planCode} / {access.subscriptionStatusCode}
        </span>
      </div>
    </div>
  );
}

function MobileHeader({
  branchName,
  branches,
  canSelectBranch,
  onBranchChange,
  onOpen,
  selectedBranchId
}: {
  branchName: string;
  branches: BranchListItem[];
  canSelectBranch: boolean;
  onBranchChange?: (branchId: string) => void;
  onOpen: () => void;
  selectedBranchId: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-outline-variant/70 bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
      <button type="button" onClick={onOpen} className="grid h-10 w-10 place-items-center rounded-xl border border-outline-variant/70 bg-white text-primary" aria-label="Open sidebar">
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        {canSelectBranch ? (
          <select
            value={selectedBranchId}
            onChange={(event) => onBranchChange?.(event.target.value)}
            className="h-10 w-full rounded-xl border border-outline-variant/70 bg-white px-3 text-sm font-bold text-on-surface outline-none"
            aria-label="Select branch"
          >
            {branches.map((branch) => (
              <option key={branch.branchId} value={branch.branchId}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <p className="text-sm font-extrabold text-on-surface">Qrave</p>
            <p className="truncate text-xs text-on-surface-variant">{branchName}</p>
          </>
        )}
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-fixed text-primary">
        <Store size={18} />
      </div>
    </header>
  );
}

function TopBranchSelect({ branches, onChange, selectedBranchId }: { branches: BranchListItem[]; onChange: (branchId: string) => void; selectedBranchId: string }) {
  return (
    <label className="relative block w-[16rem]">
      <span className="sr-only">Branch</span>
      <Store size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/75" />
      <select
        value={selectedBranchId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-outline-variant/70 bg-white py-1 pl-10 pr-10 text-sm font-bold text-on-surface shadow-sm outline-none transition-colors hover:border-primary/25 focus:border-primary/30 focus:ring-2 focus:ring-ring/15"
      >
        {branches.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </select>
      <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
    </label>
  );
}

function SearchResultIcon({ typeCode }: { typeCode: string }) {
  if (typeCode === "branch") {
    return <Store size={17} />;
  }

  if (typeCode === "menu-item") {
    return <ChefHat size={17} />;
  }

  if (typeCode === "offer") {
    return <Gift size={17} />;
  }

  return <ClipboardList size={17} />;
}

function NotificationIcon({ typeCode }: { typeCode: string }) {
  if (typeCode.startsWith("waiter-call")) {
    return <Users size={17} />;
  }

  return <ClipboardList size={17} />;
}

function formatSearchType(typeCode: string) {
  if (typeCode === "menu-item") {
    return "Menu item";
  }

  if (typeCode === "branch") {
    return "Branch";
  }

  if (typeCode === "offer") {
    return "Offer";
  }

  return "Order";
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function NavButton({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const classes = [
    "group flex h-12 items-center rounded-xl text-sm font-semibold transition-colors",
    collapsed ? "lg:justify-center lg:px-0" : "gap-3 px-3",
    active ? "bg-sidebar-active text-primary shadow-sm" : "text-white/68 hover:bg-white/10 hover:text-white",
    item.soon ? "cursor-default" : ""
  ].join(" ");

  const content = (
    <>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white text-primary" : "bg-white/5 text-current group-hover:bg-white/10"}`}>
        <Icon size={18} />
      </span>
      <span className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
        <span className="block truncate">{item.label}</span>
        <span className={`block text-[11px] font-semibold ${active ? "text-primary/60" : "text-white/38"}`}>{item.helper}</span>
      </span>
      {item.soon ? <span className={`rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/55 ${collapsed ? "lg:hidden" : ""}`}>Soon</span> : null}
    </>
  );

  if (item.href && !item.soon) {
    return (
      <Link href={item.href} className={classes} title={collapsed ? item.label : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} title={collapsed ? item.label : undefined} aria-disabled="true">
      {content}
    </div>
  );
}

function canAccessNavItem(roleCode: string | null, itemId: AdminShellProps["active"]): boolean {
  if (itemId === "billing") {
    return roleCode === "owner";
  }

  if (roleCode === "staff") {
    return ["orders", "kitchen", "settings"].includes(itemId);
  }

  if (roleCode === "kitchen") {
    return ["orders", "kitchen"].includes(itemId);
  }

  if (roleCode === "waiter") {
    return ["orders", "kitchen", "settings"].includes(itemId);
  }

  if (roleCode === "manager") {
    return !["branches", "staff"].includes(itemId);
  }

  if (roleCode === "admin") {
    return itemId !== "staff";
  }

  return true;
}
