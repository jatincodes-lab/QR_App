"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ChefHat, ClipboardList, QrCode, Settings, Store, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { BranchSelect, EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  getAdminOrders,
  getBranchOrderSettings,
  getBranchTables,
  getMenuCategories,
  getMenuItems,
  getWaiterCalls
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";

type DashboardStats = {
  menuItems: number;
  tables: number;
  openOrders: number;
  waiterCalls: number;
  directOrdering: boolean;
  waiterCallEnabled: boolean;
};

export default function AdminDashboardPage() {
  const workspace = useAdminWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setStats(null);
      return;
    }

    void loadStats(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadStats(branchId: string) {
    setIsLoadingStats(true);

    try {
      const [categories, items, tables, orders, calls, settings] = await Promise.all([
        getMenuCategories(branchId),
        getMenuItems(branchId),
        getBranchTables(branchId),
        getAdminOrders(branchId, false),
        getWaiterCalls(branchId, false),
        getBranchOrderSettings(branchId)
      ]);

      setStats({
        menuItems: items.length,
        tables: tables.length,
        openOrders: orders.filter((order) => !["Completed", "Cancelled"].includes(order.orderStatusCode)).length,
        waiterCalls: calls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)).length,
        directOrdering: Boolean(settings?.enableDirectQrOrdering),
        waiterCallEnabled: Boolean(settings?.waiterCallEnabled)
      });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingStats(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Restaurant workspace";

  return (
    <AdminShell active="dashboard" onLogout={workspace.logout} branchName={branchName}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <Store size={14} />
              Dashboard
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Operations overview</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Track setup progress, live orders, waiter calls, and branch readiness from one place.
            </p>
          </div>
          <BranchSelect branches={workspace.activeBranches} selectedBranchId={workspace.selectedBranchId} onChange={workspace.setSelectedBranchId} />
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<Store size={20} />} label="Active branches" value={workspace.activeBranches.length.toString()} note="Tenant workspace" />
              <MetricCard icon={<ChefHat size={20} />} label="Menu items" value={isLoadingStats ? "..." : String(stats?.menuItems ?? 0)} note="Selected branch" />
              <MetricCard icon={<ClipboardList size={20} />} label="Open orders" value={isLoadingStats ? "..." : String(stats?.openOrders ?? 0)} note="Kitchen queue" />
              <MetricCard icon={<Users size={20} />} label="Waiter calls" value={isLoadingStats ? "..." : String(stats?.waiterCalls ?? 0)} note="Active requests" />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Setup checklist</CardTitle>
                  <CardDescription>Complete these before sharing table QR codes with customers.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <ChecklistItem done={Boolean(workspace.selectedBranch)} label="Create branch profile" href="/admin/branches" />
                  <ChecklistItem done={(stats?.menuItems ?? 0) > 0} label="Add menu items" href="/admin/menu" />
                  <ChecklistItem done={(stats?.tables ?? 0) > 0} label="Create table QR codes" href={`/admin/branches/${workspace.selectedBranch.branchId}`} />
                  <ChecklistItem done={Boolean(stats?.directOrdering)} label="Enable QR ordering" href="/admin/settings" />
                  <ChecklistItem done={Boolean(stats?.waiterCallEnabled)} label="Enable waiter calls" href="/admin/settings" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Jump into the most common restaurant workflows.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <QuickAction icon={<ChefHat size={18} />} label="Manage menu" href="/admin/menu" />
                  <QuickAction icon={<ClipboardList size={18} />} label="Open kitchen board" href="/admin/orders" />
                  <QuickAction icon={<QrCode size={18} />} label="Manage table QR" href={`/admin/branches/${workspace.selectedBranch.branchId}`} />
                  <QuickAction icon={<Settings size={18} />} label="Ordering settings" href="/admin/settings" />
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function ChecklistItem({ done, href, label }: { done: boolean; href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/70 bg-white p-4 hover:border-primary/25">
      <div>
        <p className="text-sm font-bold text-on-surface">{label}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{done ? "Completed" : "Needs setup"}</p>
      </div>
      <BadgeState done={done} />
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Button type="button" variant="outline" className="h-12 justify-between" onClick={() => (window.location.href = href)}>
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowRight size={16} />
    </Button>
  );
}

function BadgeState({ done }: { done: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${done ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
      {done ? "Done" : "Pending"}
    </span>
  );
}
