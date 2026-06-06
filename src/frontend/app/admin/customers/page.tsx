"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, HeartHandshake, RefreshCw, Search, SlidersHorizontal, Star, UserRound, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { getCustomerReport, type CustomerReport, type OrderStatusCode, type ReportFilterInput } from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, invalid, validateOptionalText, valid } from "../../../lib/validation";

type CustomerFilterForm = {
  dateFrom: string;
  dateTo: string;
  status: string;
  search: string;
};

const StatusOptions: Array<"" | OrderStatusCode> = ["", "Placed", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];

export default function AdminCustomersPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<CustomerFilterForm>({
    dateFrom: "",
    dateTo: "",
    status: "",
    search: ""
  });
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
      setCustomers([]);
      return;
    }

    void loadCustomers(filter);
  }, [workspace.selectedBranch?.branchId]);

  async function loadCustomers(nextFilter: ReportFilterInput) {
    setIsLoading(true);
    try {
      setCustomers(await getCustomerReport(nextFilter));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateOptionalDateRange(form.dateFrom, form.dateTo),
      validateOptionalText(form.search, "Search", 120)
    );
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    void loadCustomers(filter);
  }

  const metrics = getCustomerMetrics(customers);
  const branchName = workspace.selectedBranch?.name ?? "Customers";

  return (
    <AdminShell
      active="customers"
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
              <Users size={14} />
              Customers
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Customer CRM</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Review captured WhatsApp customers, repeat visits, spend, consent, branch activity, and favorite items.
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
                <form onSubmit={applyFilters} className="grid w-full gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(16rem,1.4fr)_auto] xl:items-end">
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
                    <Input className="h-11 bg-white" value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder="Name, WhatsApp, item, branch" />
                  </label>
                  <Button type="submit" disabled={isLoading} className="h-11 px-5 sm:col-span-2 xl:col-span-1">
                    {isLoading ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}
                    Apply
                  </Button>
                </form>
              </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={<Users size={20} />} label="Customers" value={isLoading ? "..." : String(customers.length)} />
              <MetricCard icon={<RefreshCw size={20} />} label="Repeat customers" value={isLoading ? "..." : String(metrics.repeatCustomers)} />
              <MetricCard icon={<HeartHandshake size={20} />} label="WhatsApp opt-ins" value={isLoading ? "..." : String(metrics.optedInCustomers)} />
              <MetricCard icon={<Star size={20} />} label="Customer value" value={isLoading ? "..." : formatMoney(metrics.totalValue)} />
            </section>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Customer list</CardTitle>
                  <p className="mt-1 text-sm text-on-surface-variant">{customers.length} captured customers for the selected filters.</p>
                </div>
                <Badge variant="outline">{workspace.selectedBranch.name}</Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? <PageLoading /> : <CustomerList customers={customers} />}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function CustomerList({ customers }: { customers: CustomerReport[] }) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
        <UserRound size={28} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">No customers match the selected filters.</p>
        <p className="mt-1 text-sm text-on-surface-variant">Customers appear here after they place an order with a WhatsApp number.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {customers.map((customer) => (
          <CustomerCard key={customer.customerId ?? customer.customerKey} customer={customer} />
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-outline-variant/70 text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Consent</th>
              <th className="py-2 pr-4">Visits</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Total value</th>
              <th className="py-2 pr-4">Favorite item</th>
              <th className="py-2 pr-4">Branches</th>
              <th className="py-2 pr-4">Last visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {customers.map((customer) => (
              <tr key={customer.customerId ?? customer.customerKey}>
                <td className="py-4 pr-4">
                  <p className="max-w-[16rem] truncate font-extrabold text-on-surface">{displayName(customer)}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{customer.customerWhatsApp ?? "No WhatsApp saved"}</p>
                </td>
                <td className="py-4 pr-4">
                  <Badge variant={customer.marketingConsent ? "secondary" : "outline"}>{customer.marketingConsent ? "Opted in" : "No consent"}</Badge>
                </td>
                <td className="py-4 pr-4 font-semibold text-on-surface">{customer.visitCount}</td>
                <td className="py-4 pr-4 font-semibold text-on-surface">{customer.orderCount}</td>
                <td className="py-4 pr-4 font-extrabold text-primary">{formatMoney(customer.totalValue)}</td>
                <td className="py-4 pr-4">
                  <p className="max-w-[14rem] truncate font-semibold text-on-surface">{favoriteItem(customer)}</p>
                  {customer.favoriteItemQuantity > 0 ? <p className="mt-1 text-xs text-on-surface-variant">{customer.favoriteItemQuantity} ordered</p> : null}
                </td>
                <td className="py-4 pr-4">
                  <p className="max-w-[14rem] truncate font-semibold text-on-surface">{customer.lastBranchName ?? "-"}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{customer.branchesVisited || 1} visited</p>
                </td>
                <td className="py-4 pr-4 text-on-surface-variant">{formatDateTime(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CustomerCard({ customer }: { customer: CustomerReport }) {
  return (
    <article className="rounded-xl border border-outline-variant/60 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-on-surface">{displayName(customer)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{customer.customerWhatsApp ?? "No WhatsApp saved"}</p>
        </div>
        <Badge variant={customer.marketingConsent ? "secondary" : "outline"}>{customer.marketingConsent ? "Opted in" : "No consent"}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Visits" value={String(customer.visitCount)} />
        <MiniStat label="Orders" value={String(customer.orderCount)} />
        <MiniStat label="Value" value={formatMoney(customer.totalValue)} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <InfoRow label="Favorite" value={favoriteItem(customer)} />
        <InfoRow label="Last branch" value={customer.lastBranchName ?? "-"} />
        <InfoRow label="Last visit" value={formatDateTime(customer.lastVisitAtUtc ?? customer.lastOrderAtUtc)} />
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-2 py-2">
      <p className="truncate text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function getCustomerMetrics(customers: CustomerReport[]) {
  return customers.reduce(
    (metrics, customer) => ({
      repeatCustomers: metrics.repeatCustomers + (customer.visitCount > 1 || customer.orderCount > 1 ? 1 : 0),
      optedInCustomers: metrics.optedInCustomers + (customer.marketingConsent ? 1 : 0),
      totalValue: metrics.totalValue + customer.totalValue
    }),
    { repeatCustomers: 0, optedInCustomers: 0, totalValue: 0 }
  );
}

function displayName(customer: CustomerReport): string {
  return customer.customerName || customer.customerWhatsApp || "Guest customer";
}

function favoriteItem(customer: CustomerReport): string {
  if (!customer.favoriteItemName) {
    return "-";
  }

  return customer.favoriteVariantName ? `${customer.favoriteItemName} - ${customer.favoriteVariantName}` : customer.favoriteItemName;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function validateOptionalDateRange(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) {
    return valid();
  }

  if (!dateFrom || !dateTo) {
    return invalid("Choose both From and To dates, or leave both blank.");
  }

  if (dateFrom > dateTo) {
    return invalid("From date cannot be after To date.");
  }

  return valid();
}
