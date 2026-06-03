"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import {
  BarChart3,
  Bell,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Search,
  Settings,
  Store,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import type { BranchListItem } from "../lib/api";
import { getCurrentRoleCode } from "../lib/auth";

const SidebarCollapsedStorageKey = "qrapp.admin.sidebarCollapsed";

type AdminShellProps = {
  active: "dashboard" | "branches" | "menu" | "orders" | "kitchen" | "offers" | "analytics" | "settings";
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SidebarCollapsedStorageKey) === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const canSelectBranch = branches.length > 0 && Boolean(onSelectedBranchChange);
  const roleCode = getCurrentRoleCode();
  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavItem(roleCode, item.id))
    }))
    .filter((group) => group.items.length > 0);

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

        <nav className={`flex-1 overflow-y-auto px-3 py-5 ${isCollapsed ? "lg:px-2" : ""}`}>
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
            <div className="relative w-[22rem]">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/55" />
              <input
                className="h-11 w-full rounded-xl border border-outline-variant/70 bg-white px-4 pl-10 text-sm outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/25 focus:ring-2 focus:ring-ring/15"
                placeholder="Search branches, orders, menu..."
                type="text"
              />
            </div>
            <button className="relative grid h-11 w-11 place-items-center rounded-xl border border-outline-variant/70 bg-white text-on-surface-variant transition-colors hover:border-primary/20 hover:text-primary">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-mint ring-2 ring-white" />
            </button>
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

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
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
    <label className="block w-[15rem]">
      <span className="sr-only">Branch</span>
      <select
        value={selectedBranchId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-outline-variant/70 bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/25 focus:ring-2 focus:ring-ring/15"
      >
        {branches.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
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
  if (roleCode === "staff") {
    return ["orders", "kitchen", "settings"].includes(itemId);
  }

  return true;
}
