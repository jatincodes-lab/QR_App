"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, ChefHat, ClipboardCheck, QrCode, Save, Settings, Store } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { PageError } from "../../../components/admin-page-common";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  createBranch,
  createBranchOrderSettings,
  createBranchTable,
  createMenuCategory,
  createMenuItem,
  type BranchListItem,
  type BranchTable,
  type MenuCategory,
  type MenuItem
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateMoney, validatePositiveInteger, validateRequired } from "../../../lib/validation";

type SetupForm = {
  branchName: string;
  phoneNumber: string;
  city: string;
  categoryName: string;
  itemName: string;
  itemPrice: string;
  tableName: string;
  tableOrder: string;
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
};

type SetupResult = {
  branch: BranchListItem;
  category: MenuCategory;
  item: MenuItem;
  table: BranchTable;
};

const DefaultForm: SetupForm = {
  branchName: "Main Branch",
  phoneNumber: "",
  city: "",
  categoryName: "Popular",
  itemName: "Signature Coffee",
  itemPrice: "149",
  tableName: "Table 1",
  tableOrder: "1",
  enableDirectQrOrdering: true,
  requireCustomerName: true,
  requireCustomerWhatsApp: true,
  waiterCallEnabled: true
};

export default function AdminSetupPage() {
  const workspace = useAdminWorkspace();
  const [form, setForm] = useState<SetupForm>(DefaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const validation = firstInvalid(
      validateRequired(form.branchName, "Branch name", 160),
      validateRequired(form.categoryName, "Category name", 120),
      validateRequired(form.itemName, "Menu item name", 160),
      validateMoney(form.itemPrice, "Item price"),
      validateRequired(form.tableName, "Table name", 120),
      validatePositiveInteger(form.tableOrder, "Table order", 1000)
    );

    if (!validation.isValid) {
      setLocalError(validation.message);
      return;
    }

    setIsSaving(true);
    try {
      const branch = await createBranch({
        name: form.branchName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        addressLine1: null,
        addressLine2: null,
        city: form.city.trim() || null,
        state: null,
        postalCode: null,
        countryCode: "IN",
        logoUrl: null,
        logoPublicId: null
      });

      await createBranchOrderSettings(branch.branchId, {
        enableDirectQrOrdering: form.enableDirectQrOrdering,
        requireCustomerName: form.requireCustomerName,
        requireCustomerWhatsApp: form.requireCustomerWhatsApp,
        waiterCallEnabled: form.waiterCallEnabled
      });

      const category = await createMenuCategory(branch.branchId, {
        name: form.categoryName.trim(),
        displayOrder: 1
      });

      const item = await createMenuItem(branch.branchId, {
        menuCategoryId: category.menuCategoryId,
        name: form.itemName.trim(),
        description: null,
        price: Number(form.itemPrice),
        isAvailable: true,
        displayOrder: 1,
        imageUrl: null,
        imageAltText: null,
        variants: []
      });

      const table = await createBranchTable(branch.branchId, {
        name: form.tableName.trim(),
        displayOrder: Number(form.tableOrder)
      });

      workspace.setSelectedBranchId(branch.branchId);
      await workspace.loadBranches();
      setResult({ branch, category, item, table });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsSaving(false);
    }
  }

  const qrUrl = result && typeof window !== "undefined" ? `${window.location.origin}/qr/${result.table.qrToken}` : "";
  const branchName = result?.branch.name ?? workspace.selectedBranch?.name ?? "First setup";

  return (
    <AdminShell
      active="dashboard"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <ClipboardCheck size={14} />
              First setup
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Launch your first QR menu</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Create a branch, ordering rules, one menu item, and one table QR in a single flow.
            </p>
          </div>
          {result ? (
            <Link href="/admin/dashboard">
              <Button type="button">
                Open dashboard
                <ArrowRight size={17} />
              </Button>
            </Link>
          ) : null}
        </header>

        <PageError message={localError ?? workspace.workspaceError} />

        {result ? (
          <SetupComplete result={result} qrUrl={qrUrl} />
        ) : (
          <form onSubmit={submitSetup} className="grid gap-5">
            <section className="grid gap-4 lg:grid-cols-2">
              <SetupCard icon={<Store size={18} />} title="Branch">
                <Field label="Branch name" value={form.branchName} onChange={(value) => setForm({ ...form, branchName: value })} />
                <Field label="Phone number" value={form.phoneNumber} onChange={(value) => setForm({ ...form, phoneNumber: value })} placeholder="Optional" />
                <Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} placeholder="Optional" />
              </SetupCard>

              <SetupCard icon={<Settings size={18} />} title="Ordering rules">
                <Toggle label="Enable direct QR ordering" checked={form.enableDirectQrOrdering} onChange={(value) => setForm({ ...form, enableDirectQrOrdering: value })} />
                <Toggle label="Require customer name" checked={form.requireCustomerName} onChange={(value) => setForm({ ...form, requireCustomerName: value })} />
                <Toggle label="Require WhatsApp number" checked={form.requireCustomerWhatsApp} onChange={(value) => setForm({ ...form, requireCustomerWhatsApp: value })} />
                <Toggle label="Enable waiter calls" checked={form.waiterCallEnabled} onChange={(value) => setForm({ ...form, waiterCallEnabled: value })} />
              </SetupCard>

              <SetupCard icon={<ChefHat size={18} />} title="First menu item">
                <Field label="Category" value={form.categoryName} onChange={(value) => setForm({ ...form, categoryName: value })} />
                <Field label="Item name" value={form.itemName} onChange={(value) => setForm({ ...form, itemName: value })} />
                <Field label="Price" value={form.itemPrice} onChange={(value) => setForm({ ...form, itemPrice: value })} inputMode="decimal" />
              </SetupCard>

              <SetupCard icon={<QrCode size={18} />} title="First table QR">
                <Field label="Table name" value={form.tableName} onChange={(value) => setForm({ ...form, tableName: value })} />
                <Field label="Display order" value={form.tableOrder} onChange={(value) => setForm({ ...form, tableOrder: value })} inputMode="numeric" />
                <Alert>
                  <AlertDescription>The QR link is generated automatically after setup.</AlertDescription>
                </Alert>
              </SetupCard>
            </section>

            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/70 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-on-surface">Ready to create demo setup</p>
                <p className="mt-1 text-sm text-on-surface-variant">You can edit everything later from Branches, Menu, Tables, and Settings.</p>
              </div>
              <Button type="submit" disabled={isSaving} className="h-11">
                {isSaving ? "Creating..." : "Create setup"}
                <Save size={17} />
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}

function SetupCard({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary-container text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  inputMode,
  label,
  onChange,
  placeholder,
  value
}: {
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-11 bg-white" />
    </label>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-outline-variant/70 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-outline-variant text-primary" />
    </label>
  );
}

function SetupComplete({ qrUrl, result }: { qrUrl: string; result: SetupResult }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardContent className="p-6">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-secondary-container text-primary">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-on-surface">First setup is ready</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            {result.branch.name} now has ordering settings, one category, one item, and one table QR code.
          </p>
          <div className="mt-5 grid gap-2 text-sm">
            <SummaryRow label="Category" value={result.category.name} />
            <SummaryRow label="Item" value={result.item.name} />
            <SummaryRow label="Table" value={result.table.name} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public QR link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low px-4 py-3">
            <p className="break-all text-sm font-semibold text-on-surface">{qrUrl}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => void navigator.clipboard.writeText(qrUrl)} variant="outline">
              Copy QR link
            </Button>
            <Link href={`/qr/${result.table.qrToken}`} target="_blank">
              <Button type="button">
                Open customer menu
                <ArrowRight size={17} />
              </Button>
            </Link>
            <Link href={`/admin/branches/${result.branch.branchId}?tab=tables`}>
              <Button type="button" variant="outline">
                Manage table QR
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/70 bg-white px-3 py-2">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}
