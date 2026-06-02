"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, ChefHat, ClipboardList, QrCode, Store, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { BranchSelect, EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { getAdminOrders, getBranchTables, getMenuItems, getWaiterCalls, type AdminOrder, type WaiterCall } from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";

type AnalyticsStats = {
  menuItems: number;
  tables: number;
  orders: AdminOrder[];
  waiterCalls: WaiterCall[];
};

export default function AdminAnalyticsPage() {
  const workspace = useAdminWorkspace();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const completedOrders = useMemo(() => stats?.orders.filter((order) => order.orderStatusCode === "Completed") ?? [], [stats]);
  const openOrders = useMemo(() => stats?.orders.filter((order) => !["Completed", "Cancelled"].includes(order.orderStatusCode)) ?? [], [stats]);
  const completedValue = useMemo(() => completedOrders.reduce((total, order) => total + order.totalAmount, 0), [completedOrders]);
  const activeCalls = useMemo(() => stats?.waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)) ?? [], [stats]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setStats(null);
      return;
    }

    void loadAnalytics(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadAnalytics(branchId: string) {
    setIsLoadingStats(true);

    try {
      const [items, tables, orders, waiterCalls] = await Promise.all([
        getMenuItems(branchId),
        getBranchTables(branchId),
        getAdminOrders(branchId, true),
        getWaiterCalls(branchId, true)
      ]);

      setStats({ menuItems: items.length, tables: tables.length, orders, waiterCalls });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingStats(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Analytics";

  return (
    <AdminShell active="analytics" onLogout={workspace.logout} branchName={branchName}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <BarChart3 size={14} />
              Analytics
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Operational analytics</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Practical branch metrics from existing order, waiter-call, menu, and table data.
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
              <MetricCard icon={<ClipboardList size={20} />} label="Total orders" value={isLoadingStats ? "..." : String(stats?.orders.length ?? 0)} />
              <MetricCard icon={<Store size={20} />} label="Completed value" value={isLoadingStats ? "..." : formatMoney(completedValue)} />
              <MetricCard icon={<ChefHat size={20} />} label="Menu items" value={isLoadingStats ? "..." : String(stats?.menuItems ?? 0)} />
              <MetricCard icon={<QrCode size={20} />} label="QR tables" value={isLoadingStats ? "..." : String(stats?.tables ?? 0)} />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <InsightCard title="Kitchen pressure" value={`${openOrders.length} open`} text="Orders not completed or cancelled." />
              <InsightCard title="Service requests" value={`${activeCalls.length} active`} text="Waiter calls still requiring staff attention." />
              <InsightCard title="Setup coverage" value={`${stats?.tables ?? 0} tables`} text="Tables currently available for QR menu links." />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Reporting roadmap</CardTitle>
                <CardDescription>These analytics are live MVP metrics. Revenue charts and time-series reports need backend aggregate APIs next.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <RoadmapItem icon={<BarChart3 size={18} />} title="Daily sales chart" />
                <RoadmapItem icon={<ChefHat size={18} />} title="Top menu items" />
                <RoadmapItem icon={<Users size={18} />} title="Service response time" />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function InsightCard({ text, title, value }: { text: string; title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{title}</p>
        <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{text}</p>
      </CardContent>
    </Card>
  );
}

function RoadmapItem({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-primary">{icon}</div>
      <p className="text-sm font-bold text-on-surface">{title}</p>
    </div>
  );
}
