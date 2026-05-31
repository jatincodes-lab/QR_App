"use client";

import { ReactNode, useState } from "react";
import { BarChart3, Bell, ChefHat, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, QrCode, Search, Settings, Store } from "lucide-react";
import { Button } from "./ui/button";

type AdminShellProps = {
  active: "dashboard" | "branches" | "menu" | "analytics" | "settings";
  branchName?: string;
  children: ReactNode;
  onLogout: () => void;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, disabled: true },
  { id: "analytics", label: "Analytics", icon: BarChart3, disabled: true },
  { id: "menu", label: "Menu", icon: ChefHat, disabled: true },
  { id: "branches", label: "Branches", icon: Store, disabled: false },
  { id: "settings", label: "Settings", icon: Settings, disabled: true }
] as const;

export function AdminShell({ active, branchName = "Downtown Flagship", children, onLogout }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`min-h-screen bg-background text-on-background lg:grid ${isCollapsed ? "lg:grid-cols-[5rem_1fr]" : "lg:grid-cols-[16rem_1fr]"}`}>
      <aside
        className={`border-b border-outline-variant/30 bg-surface-container-lowest transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:border-b-0 lg:border-r ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        <div className={`flex h-16 items-center justify-between px-4 lg:h-full lg:min-h-screen lg:flex-col lg:py-8 ${isCollapsed ? "lg:px-0" : "lg:items-stretch lg:px-4"}`}>
          <div className={isCollapsed ? "lg:flex lg:w-full lg:flex-col lg:items-center" : ""}>
            <div className={`flex items-center gap-3 px-1 lg:px-2 ${isCollapsed ? "lg:flex-col lg:justify-center lg:gap-3 lg:px-0" : ""}`}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-soft-gold shadow-soft-saas">
                <QrCode size={21} strokeWidth={2.3} />
              </div>
              <div className={`min-w-0 flex-1 ${isCollapsed ? "lg:hidden" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight text-primary">Qrave</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Restaurant OS</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCollapsed((current) => !current)}
                    className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-outline-variant/50 bg-white text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary lg:grid"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed((current) => !current)}
                className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-outline-variant/50 bg-white text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary ${
                  isCollapsed ? "lg:grid" : "lg:hidden"
                }`}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <nav className={`mt-10 hidden space-y-1 lg:block ${isCollapsed ? "lg:w-full lg:px-3" : ""}`}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;

                return (
                  <div
                    key={item.id}
                    title={isCollapsed ? item.label : undefined}
                    className={[
                      "flex h-11 items-center rounded-lg text-sm font-semibold transition-colors",
                      isCollapsed ? "mx-auto w-11 justify-center px-0" : "gap-3 px-4",
                      isActive
                        ? isCollapsed
                          ? "bg-primary/5 text-primary ring-1 ring-primary/10"
                          : "border-l-4 border-primary bg-primary/5 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-primary",
                      item.disabled ? "opacity-60" : ""
                    ].join(" ")}
                  >
                    <Icon size={18} />
                    <span className={isCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className={`flex items-center gap-3 lg:block lg:border-t lg:border-outline-variant/20 lg:pt-6 ${isCollapsed ? "lg:w-full lg:px-3" : "lg:px-2"}`}>
            <div className={`hidden rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 lg:flex lg:items-center ${isCollapsed ? "lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:p-0" : "lg:gap-3"}`}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fixed-dim text-primary">
                <Store size={18} />
              </div>
              <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-semibold text-on-surface">{branchName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Owner workspace</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              className={`gap-2 lg:mt-4 ${isCollapsed ? "lg:mx-auto lg:h-11 lg:w-11 lg:px-0" : "lg:w-full"}`}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut size={17} />
              <span className={`hidden sm:inline ${isCollapsed ? "lg:hidden" : ""}`}>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:col-start-2 lg:ml-0">
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/90 px-margin backdrop-blur-md lg:flex">
          <div className="relative w-full max-w-md">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              className="h-10 w-full rounded-xl border border-transparent bg-surface-container-low px-4 pl-10 text-sm outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/20 focus:bg-white focus:ring-2 focus:ring-primary/10"
              placeholder="Search orders, items, or branches..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-3 py-2">
              <Store size={17} className="text-primary" />
              <span className="text-sm font-semibold text-on-surface">{branchName}</span>
            </div>
            <button className="relative grid h-10 w-10 place-items-center rounded-xl bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-soft-gold ring-2 ring-white" />
            </button>
          </div>
        </header>

        <main className="px-4 py-5 lg:px-margin lg:py-8">{children}</main>
      </div>
    </div>
  );
}
