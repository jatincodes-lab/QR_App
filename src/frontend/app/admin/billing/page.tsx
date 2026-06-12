"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, CheckCircle2, CreditCard, Loader2, PowerOff, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { PageError, PageLoading } from "../../../components/admin-page-common";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  ApiError,
  extendTenantTrial,
  getTenantSubscription,
  reactivateTenantSubscription,
  suspendTenantSubscription,
  updateTenantSubscription,
  type AccountStatusCode,
  type SubscriptionStatusCode,
  type TenantSubscription,
  type UpdateTenantSubscriptionInput
} from "../../../lib/api";
import { clearAccessToken, getAccessToken, setAdminSession } from "../../../lib/auth";

const SubscriptionStatuses: SubscriptionStatusCode[] = ["Trialing", "Active", "ManualActive", "PastDue", "Suspended", "Cancelled", "Expired"];
const AccountStatuses: AccountStatusCode[] = ["Active", "Inactive"];

export default function AdminBillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [form, setForm] = useState<UpdateTenantSubscriptionInput>({
    planCode: "trial",
    subscriptionStatusCode: "Trialing",
    accountStatusCode: "Active",
    trialEndAtUtc: null,
    subscriptionNotes: null
  });
  const [extensionDays, setExtensionDays] = useState(7);
  const [actionNote, setActionNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"save" | "extend" | "reactivate" | "suspend" | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadSubscription();
  }, [router]);

  async function loadSubscription() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getTenantSubscription();
      applySubscription(response);
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  function applySubscription(next: TenantSubscription) {
    setSubscription(next);
    setForm(toForm(next));
    setAdminSession({
      tenant: {
        tenantId: next.tenantId,
        name: next.name,
        slug: next.slug,
        accessStatus: next.accessStatus
      }
    });
  }

  function handleApiError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      clearAccessToken();
      router.replace("/admin/login");
      return;
    }

    setError(caught instanceof ApiError ? caught.message : "Billing settings could not be loaded.");
  }

  async function saveManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save");
    setError(null);
    setNotice(null);

    try {
      const saved = await updateTenantSubscription({
        ...form,
        planCode: form.planCode.trim().toLowerCase(),
        subscriptionNotes: cleanNullable(form.subscriptionNotes)
      });
      applySubscription(saved);
      setNotice("Subscription updated.");
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(action: "extend" | "reactivate" | "suspend") {
    setBusyAction(action);
    setError(null);
    setNotice(null);

    try {
      const note = cleanNullable(actionNote);
      const saved = action === "extend"
        ? await extendTenantTrial({ days: Number(extensionDays) || 0, subscriptionNotes: note })
        : action === "reactivate"
          ? await reactivateTenantSubscription({ subscriptionNotes: note })
          : await suspendTenantSubscription({ subscriptionNotes: note });

      applySubscription(saved);
      setActionNote("");
      setNotice(action === "extend" ? "Trial extended." : action === "reactivate" ? "Tenant reactivated." : "Tenant suspended.");
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setBusyAction(null);
    }
  }

  const statusTone = useMemo(() => {
    if (!subscription) {
      return "neutral";
    }

    return subscription.accessStatus.isAccessAllowed ? "active" : "blocked";
  }, [subscription]);

  return (
    <AdminShell active="billing" branchName={subscription?.name ?? "Billing"} onLogout={() => {
      clearAccessToken();
      router.replace("/admin/login");
    }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <CreditCard size={14} />
              Billing
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Subscription access</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Manage the current restaurant account status, trial window, and access controls.
            </p>
          </div>
        </header>

        <PageError message={error} />
        {notice ? (
          <Alert variant="success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <PageLoading />
        ) : subscription ? (
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>{subscription.ownerEmail}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusPanel tone={statusTone} subscription={subscription} />
                  <InfoRow label="Restaurant" value={subscription.name} />
                  <InfoRow label="Slug" value={subscription.slug} />
                  <InfoRow label="Plan" value={subscription.planCode} />
                  <InfoRow label="Trial start" value={formatDateTime(subscription.trialStartAtUtc)} />
                  <InfoRow label="Trial end" value={formatDateTime(subscription.trialEndAtUtc)} />
                  <InfoRow label="Last updated" value={formatDateTime(subscription.subscriptionUpdatedAtUtc)} />
                  {subscription.subscriptionNotes ? <InfoRow label="Note" value={subscription.subscriptionNotes} /> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Common access updates for support and pilot operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <Field label="Days">
                      <Input type="number" min="1" max="365" value={extensionDays} onChange={(event) => setExtensionDays(Number(event.target.value))} />
                    </Field>
                    <Field label="Action note">
                      <Input value={actionNote} maxLength={500} onChange={(event) => setActionNote(event.target.value)} placeholder="Optional internal note" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button type="button" variant="secondary" disabled={busyAction !== null} onClick={() => runAction("extend")}>
                      {busyAction === "extend" ? <Loader2 size={17} className="animate-spin" /> : <CalendarPlus size={17} />}
                      Extend
                    </Button>
                    <Button type="button" variant="secondary" disabled={busyAction !== null} onClick={() => runAction("reactivate")}>
                      {busyAction === "reactivate" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                      Activate
                    </Button>
                    <Button type="button" variant="destructive" disabled={busyAction !== null} onClick={() => runAction("suspend")}>
                      {busyAction === "suspend" ? <Loader2 size={17} className="animate-spin" /> : <PowerOff size={17} />}
                      Suspend
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Manual override</CardTitle>
                <CardDescription>Use this for exact subscription corrections after support review.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveManual} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Plan code">
                      <Input value={form.planCode} maxLength={40} onChange={(event) => setForm({ ...form, planCode: event.target.value })} />
                    </Field>
                    <Field label="Subscription status">
                      <select value={form.subscriptionStatusCode} onChange={(event) => setForm({ ...form, subscriptionStatusCode: event.target.value as SubscriptionStatusCode })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        {SubscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </Field>
                    <Field label="Account status">
                      <select value={form.accountStatusCode} onChange={(event) => setForm({ ...form, accountStatusCode: event.target.value as AccountStatusCode })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        {AccountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Trial end">
                    <Input type="datetime-local" value={toDateTimeLocal(form.trialEndAtUtc)} onChange={(event) => setForm({ ...form, trialEndAtUtc: fromDateTimeLocal(event.target.value) })} />
                  </Field>

                  <Field label="Internal note">
                    <textarea
                      value={form.subscriptionNotes ?? ""}
                      maxLength={500}
                      onChange={(event) => setForm({ ...form, subscriptionNotes: event.target.value })}
                      className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-ring/15"
                    />
                  </Field>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                    <div className="flex gap-2">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <p>Changing account status immediately affects admin API access and public QR ordering for this restaurant.</p>
                    </div>
                  </div>

                  <Button type="submit" disabled={busyAction !== null}>
                    {busyAction === "save" ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                    Save override
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function StatusPanel({ subscription, tone }: { subscription: TenantSubscription; tone: "active" | "blocked" | "neutral" }) {
  const classes = tone === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : tone === "blocked"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-outline-variant bg-surface-container text-on-surface";

  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <p className="text-sm font-extrabold">{subscription.accessStatus.isAccessAllowed ? "Access active" : "Access blocked"}</p>
      <p className="mt-1 text-sm font-semibold opacity-85">{subscription.accessStatus.message}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide opacity-70">
        {subscription.subscriptionStatusCode} / {subscription.accountStatusCode}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function toForm(subscription: TenantSubscription): UpdateTenantSubscriptionInput {
  return {
    planCode: subscription.planCode,
    subscriptionStatusCode: subscription.subscriptionStatusCode,
    accountStatusCode: subscription.accountStatusCode,
    trialEndAtUtc: subscription.trialEndAtUtc,
    subscriptionNotes: subscription.subscriptionNotes
  };
}

function cleanNullable(value: string | null): string | null {
  const clean = value?.trim() ?? "";
  return clean.length > 0 ? clean : null;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
