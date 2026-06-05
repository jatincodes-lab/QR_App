"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, BarChart3, BellRing, ChefHat, ClipboardList, Store, Table2 } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
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
  const averageOrderValue = completedOrders.length > 0 ? completedValue / completedOrders.length : 0;
  const activeCalls = useMemo(() => stats?.waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)) ?? [], [stats]);
  const orderStatusData = useMemo(() => buildCountData(stats?.orders ?? [], (order) => order.orderStatusCode, OrderStatusLabels), [stats]);
  const waiterStatusData = useMemo(() => buildCountData(stats?.waiterCalls ?? [], (call) => call.statusCode, WaiterStatusLabels), [stats]);
  const orderValueData = useMemo(() => buildRecentOrderValueData(stats?.orders ?? []), [stats]);
  const topItems = useMemo(() => buildTopItems(stats?.orders ?? []), [stats]);

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
    <AdminShell
      active="analytics"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
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
              <MetricCard icon={<BarChart3 size={20} />} label="Average order" value={isLoadingStats ? "..." : formatMoney(averageOrderValue)} />
              <MetricCard icon={<ChefHat size={20} />} label="Menu items" value={isLoadingStats ? "..." : String(stats?.menuItems ?? 0)} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <InsightCard icon={<Activity size={20} />} title="Kitchen pressure" value={`${openOrders.length} open`} text="Orders not completed or cancelled." tone="warning" />
              <InsightCard icon={<BellRing size={20} />} title="Service requests" value={`${activeCalls.length} active`} text="Waiter calls still requiring staff attention." tone="primary" />
              <InsightCard icon={<Table2 size={20} />} title="Setup coverage" value={`${stats?.tables ?? 0} tables`} text="Tables currently available for QR menu links." tone="neutral" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <BarChartCard title="Order value trend" description="Last 7 days from completed and active order records." data={orderValueData} valueFormatter={formatMoney} />
              <DonutChartCard title="Order status mix" description="Current distribution by order status." data={orderStatusData} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <DonutChartCard title="Waiter-call status" description="Service request distribution." data={waiterStatusData} />
              <TopItemsCard items={topItems} />
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function InsightCard({
  icon,
  text,
  title,
  tone,
  value
}: {
  icon: ReactNode;
  text: string;
  title: string;
  tone: "neutral" | "primary" | "warning";
  value: string;
}) {
  const toneClass = {
    neutral: "bg-white text-primary ring-outline-variant/80",
    primary: "bg-secondary-container text-primary ring-primary/10",
    warning: "bg-[#fff4d8] text-[#8a5600] ring-[#f3d485]"
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex min-h-32 items-center p-5">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{title}</p>
            <p className="mt-2 text-2xl font-extrabold leading-none text-on-surface">{value}</p>
            <p className="mt-3 text-sm leading-5 text-on-surface-variant">{text}</p>
          </div>
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${toneClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const OrderStatusLabels = ["Placed", "Accepted", "Preparing", "Ready", "Completed", "Cancelled"];
const WaiterStatusLabels = ["Open", "Acknowledged", "Resolved", "Cancelled"];
const ChartColors = ["#20c77a", "#c8ef68", "#f4c542", "#0b3b2a", "#7a8578", "#d6dfd1"];

type ChartDatum = {
  label: string;
  value: number;
};

type TopItemDatum = {
  name: string;
  quantity: number;
  value: number;
};

function TopItemsCard({ items }: { items: TopItemDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Best-selling items</CardTitle>
        <CardDescription>Top items by quantity from current order records.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
            <p className="text-sm font-bold text-on-surface">No sales yet</p>
            <p className="mt-1 text-sm text-on-surface-variant">Completed and active order items will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item, index) => (
              <div key={item.name} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl border border-outline-variant/60 bg-white p-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-fixed text-sm font-extrabold text-primary">{index + 1}</div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-on-surface">{item.name}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{item.quantity} sold</p>
                </div>
                <p className="text-sm font-extrabold text-primary">{formatMoney(item.value)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({
  data,
  description,
  title,
  valueFormatter
}: {
  data: ChartDatum[];
  description: string;
  title: string;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-end gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
          {data.map((item, index) => {
            const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 3);

            return (
              <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div className="text-center text-[11px] font-bold text-on-surface">{item.value > 0 ? valueFormatter(item.value) : "-"}</div>
                <div className="flex h-48 w-full items-end">
                  <div
                    className="w-full rounded-t-xl transition-all"
                    style={{
                      background: `linear-gradient(180deg, ${ChartColors[index % ChartColors.length]}, rgba(32, 199, 122, 0.2))`,
                      height: `${height}%`
                    }}
                  />
                </div>
                <p className="truncate text-xs font-semibold text-on-surface-variant">{item.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DonutChartCard({ data, description, title }: { data: ChartDatum[]; description: string; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const segments = buildDonutSegments(data, total);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[13rem_1fr] md:items-center">
        <div className="relative mx-auto grid h-48 w-48 place-items-center rounded-full bg-surface-container-low">
          <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
            <circle cx="60" cy="60" r="42" fill="none" stroke="#e3eadf" strokeWidth="18" />
            {segments.map((segment) => (
              <circle
                key={segment.label}
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={segment.color}
                strokeDasharray={`${segment.length} ${segment.gap}`}
                strokeDashoffset={segment.offset}
                strokeLinecap="round"
                strokeWidth="18"
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className="text-3xl font-extrabold text-primary">{total}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">total</p>
          </div>
        </div>

        <div className="grid gap-2">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/70 bg-white px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ChartColors[index % ChartColors.length] }} />
                <span className="truncate text-sm font-semibold text-on-surface">{item.label}</span>
              </span>
              <span className="text-sm font-extrabold text-primary">{item.value}</span>
            </div>
          ))}
        </div>
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

function buildCountData<T>(items: T[], getLabel: (item: T) => string, labels: string[]): ChartDatum[] {
  return labels.map((label) => ({
    label,
    value: items.filter((item) => getLabel(item) === label).length
  }));
}

function buildRecentOrderValueData(orders: AdminOrder[]): ChartDatum[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return days.map((date) => {
    const key = toDateKey(date);
    const value = orders
      .filter((order) => toDateKey(parseDate(order.createdAtUtc)) === key)
      .reduce((total, order) => total + order.totalAmount, 0);

    return {
      label: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date),
      value
    };
  });
}

function buildTopItems(orders: AdminOrder[]): TopItemDatum[] {
  const totals = new Map<string, TopItemDatum>();

  orders
    .filter((order) => order.orderStatusCode !== "Cancelled")
    .flatMap((order) => order.items)
    .forEach((item) => {
      const name = item.variantName ? `${item.menuItemName} - ${item.variantName}` : item.menuItemName;
      const existing = totals.get(name) ?? { name, quantity: 0, value: 0 };
      totals.set(name, {
        name,
        quantity: existing.quantity + item.quantity,
        value: existing.value + item.lineTotal
      });
    });

  return [...totals.values()]
    .sort((left, right) => right.quantity - left.quantity || right.value - left.value)
    .slice(0, 6);
}

function buildDonutSegments(data: ChartDatum[], total: number) {
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  if (total === 0) {
    return [];
  }

  return data
    .filter((item) => item.value > 0)
    .map((item, index) => {
      const length = (item.value / total) * circumference;
      const segment = {
        color: ChartColors[index % ChartColors.length],
        gap: circumference - length,
        label: item.label,
        length,
        offset: -offset
      };
      offset += length;
      return segment;
    });
}

function parseDate(value: string): Date {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimeZone ? value : `${value}Z`);
}

function toDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}
