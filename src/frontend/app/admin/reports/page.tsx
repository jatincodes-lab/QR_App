"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, ClipboardList, RefreshCw, Search, SlidersHorizontal, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  getCustomerReport,
  getItemReport,
  getOrderReportOrders,
  getOrderReportSummary,
  type CustomerReport,
  type ItemReport,
  type OrderReportListItem,
  type OrderReportSummary,
  type OrderStatusCode,
  type ReportFilterInput
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateDateRange, validateOptionalText } from "../../../lib/validation";

type ReportForm = {
  dateFrom: string;
  dateTo: string;
  status: string;
  search: string;
};

const EmptyForm: ReportForm = {
  dateFrom: todayInputValue(),
  dateTo: todayInputValue(),
  status: "",
  search: ""
};

const StatusOptions: Array<"" | OrderStatusCode> = ["", "Placed", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];

export default function AdminReportsPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<ReportForm>(EmptyForm);
  const [summary, setSummary] = useState<OrderReportSummary | null>(null);
  const [orders, setOrders] = useState<OrderReportListItem[]>([]);
  const [items, setItems] = useState<ItemReport[]>([]);
  const [customers, setCustomers] = useState<CustomerReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filter = useMemo<ReportFilterInput>(() => ({
    branchId: workspace.selectedBranchId || undefined,
    dateFrom: form.dateFrom || undefined,
    dateTo: form.dateTo || undefined,
    status: form.status || undefined,
    search: form.search.trim() || undefined
  }), [form, workspace.selectedBranchId]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setSummary(null);
      setOrders([]);
      setItems([]);
      setCustomers([]);
      return;
    }

    void loadReports(filter);
  }, [workspace.selectedBranch?.branchId]);

  async function loadReports(nextFilter: ReportFilterInput) {
    setIsLoading(true);
    try {
      const [summaryResponse, orderResponse, itemResponse, customerResponse] = await Promise.all([
        getOrderReportSummary(nextFilter),
        getOrderReportOrders(nextFilter),
        getItemReport(nextFilter),
        getCustomerReport(nextFilter)
      ]);

      setSummary(summaryResponse);
      setOrders(orderResponse);
      setItems(itemResponse);
      setCustomers(customerResponse);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateDateRange(form.dateFrom, form.dateTo),
      validateOptionalText(form.search, "Search", 120)
    );
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    void loadReports(filter);
  }

  const branchName = workspace.selectedBranch?.name ?? "Reports";

  return (
    <AdminShell
      active="reports"
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
              <ClipboardList size={14} />
              Reports
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Order history and customer reports</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Track every QR order with status timing, customer details, top items, and campaign-ready customer activity.
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
            <Card className="bg-surface-container-low/70">
              <CardContent className="flex min-h-[6.75rem] items-center px-5 py-6 sm:px-6">
                <form onSubmit={applyFilters} className="grid w-full gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(15rem,1.3fr)_auto] xl:items-end">
                  <label className="grid gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <CalendarDays size={13} />
                      From
                    </span>
                    <Input className="h-11 bg-white" type="date" value={form.dateFrom} onChange={(event) => setForm({ ...form, dateFrom: event.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <CalendarDays size={13} />
                      To
                    </span>
                    <Input className="h-11 bg-white" type="date" value={form.dateTo} onChange={(event) => setForm({ ...form, dateTo: event.target.value })} />
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <SlidersHorizontal size={13} />
                      Status
                    </span>
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20">
                      {StatusOptions.map((status) => (
                        <option key={status || "all"} value={status}>{status || "All statuses"}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <Search size={13} />
                      Search
                    </span>
                    <Input className="h-11 bg-white" value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder="Order, table, phone" />
                  </label>
                  <Button type="submit" disabled={isLoading} className="h-11 px-5 sm:col-span-2 xl:col-span-1">
                    {isLoading ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}
                    Apply
                  </Button>
                </form>
              </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={<ClipboardList size={20} />} label="Orders" value={isLoading ? "..." : String(summary?.totalOrders ?? 0)} />
              <MetricCard icon={<BarChart3 size={20} />} label="Completed" value={isLoading ? "..." : String(summary?.completedOrders ?? 0)} />
              <MetricCard icon={<RefreshCw size={20} />} label="Cancelled" value={isLoading ? "..." : String(summary?.cancelledOrders ?? 0)} />
              <MetricCard icon={<BarChart3 size={20} />} label="Order value" value={isLoading ? "..." : formatMoney(summary?.totalOrderValue ?? 0)} />
              <MetricCard icon={<Users size={20} />} label="Avg ready" value={isLoading ? "..." : `${Math.round(summary?.averageReadyMinutes ?? 0)} min`} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Order history</CardTitle>
                  <CardDescription>Status timings and customer details for filtered orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <PageLoading /> : <OrderHistoryTable orders={orders} />}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <TopItemsCard items={items} />
                <CustomersCard customers={customers} />
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function OrderHistoryTable({ orders }: { orders: OrderReportListItem[] }) {
  if (orders.length === 0) {
    return <EmptyReport text="No orders match the selected filters." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-outline-variant/70 text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Table</th>
            <th className="py-2 pr-3">Customer</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Placed</th>
            <th className="py-2 pr-3">Accepted</th>
            <th className="py-2 pr-3">Ready</th>
            <th className="py-2 pr-3">Served</th>
            <th className="py-2 pr-3">Items</th>
            <th className="py-2 pr-3">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td className="py-3 pr-3 font-extrabold text-primary">#{shortOrderCode(order.orderId)}</td>
              <td className="py-3 pr-3">{order.tableName}</td>
              <td className="py-3 pr-3">
                <p className="font-semibold text-on-surface">{order.customerName || "Guest"}</p>
                <p className="text-xs text-on-surface-variant">{order.customerWhatsApp || "-"}</p>
              </td>
              <td className="py-3 pr-3"><Badge variant={order.orderStatusCode === "Cancelled" ? "outline" : "secondary"}>{order.orderStatusCode}</Badge></td>
              <td className="py-3 pr-3">{formatDateTime(order.createdAtUtc)}</td>
              <td className="py-3 pr-3">{formatDateTime(order.acceptedAtUtc)}</td>
              <td className="py-3 pr-3">{formatDateTime(order.readyAtUtc)}</td>
              <td className="py-3 pr-3">{formatDateTime(order.servedAtUtc)}</td>
              <td className="py-3 pr-3">{order.itemCount}</td>
              <td className="py-3 pr-3">{order.latestReason || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopItemsCard({ items }: { items: ItemReport[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top items</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 ? <EmptyReport text="No item data yet." /> : items.slice(0, 6).map((item) => (
          <div key={`${item.itemName}-${item.variantName ?? ""}`} className="rounded-xl border border-outline-variant/60 bg-white p-3">
            <p className="text-sm font-extrabold text-on-surface">{item.variantName ? `${item.itemName} - ${item.variantName}` : item.itemName}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{item.quantity} sold · {item.orderCount} orders · {formatMoney(item.totalValue)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CustomersCard({ customers }: { customers: CustomerReport[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer activity</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {customers.length === 0 ? <EmptyReport text="No customer data yet." /> : customers.slice(0, 6).map((customer) => (
          <div key={customer.customerKey} className="rounded-xl border border-outline-variant/60 bg-white p-3">
            <p className="text-sm font-extrabold text-on-surface">{customer.customerName || customer.customerWhatsApp || "Guest"}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{customer.orderCount} orders · {formatMoney(customer.totalValue)} · Last {formatDateTime(customer.lastOrderAtUtc)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyReport({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-6 text-center text-sm font-semibold text-on-surface-variant">{text}</div>;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
