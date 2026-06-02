"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, Settings, Store } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { BranchSelect, EmptyBranchState, PageError, PageLoading } from "../../../components/admin-page-common";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  createBranchOrderSettings,
  getBranchOrderSettings,
  updateBranchOrderSettings,
  type BranchOrderSettings,
  type SaveBranchOrderSettingsInput
} from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";

const DefaultSettings: SaveBranchOrderSettingsInput = {
  enableDirectQrOrdering: false,
  requireCustomerName: true,
  requireCustomerWhatsApp: true,
  waiterCallEnabled: false
};

export default function AdminSettingsPage() {
  const workspace = useAdminWorkspace();
  const [settings, setSettings] = useState<BranchOrderSettings | null>(null);
  const [form, setForm] = useState<SaveBranchOrderSettingsInput>(DefaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setSettings(null);
      setForm(DefaultSettings);
      return;
    }

    void loadSettings(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadSettings(branchId: string) {
    setIsLoadingSettings(true);
    setNotice(null);

    try {
      const response = await getBranchOrderSettings(branchId);
      setSettings(response);
      setForm(response ? toForm(response) : DefaultSettings);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingSettings(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const saved = settings
        ? await updateBranchOrderSettings(workspace.selectedBranch.branchId, form)
        : await createBranchOrderSettings(workspace.selectedBranch.branchId, form);

      setSettings(saved);
      setForm(toForm(saved));
      setNotice("Branch settings saved.");
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsSaving(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Settings";

  return (
    <AdminShell active="settings" onLogout={workspace.logout} branchName={branchName}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <Settings size={14} />
              Settings
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Branch settings</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Control customer ordering rules, required details, and waiter-call availability for each branch.
            </p>
          </div>
          <BranchSelect branches={workspace.activeBranches} selectedBranchId={workspace.selectedBranchId} onChange={workspace.setSelectedBranchId} />
        </header>

        <PageError message={workspace.workspaceError} />
        {notice ? (
          <Alert variant="success">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Workspace</CardTitle>
                <CardDescription>Current selected restaurant branch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-fixed text-primary">
                    <Store size={20} />
                  </div>
                  <div>
                    <p className="font-extrabold text-on-surface">{workspace.selectedBranch.name}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {[workspace.selectedBranch.city, workspace.selectedBranch.countryCode].filter(Boolean).join(", ") || "Location not added"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-on-surface-variant">
                  Profile fields such as address and phone are edited from the branch detail workspace.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR ordering controls</CardTitle>
                <CardDescription>These settings affect the public QR menu and customer checkout flow.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <PageLoading />
                ) : (
                  <form onSubmit={saveSettings} className="space-y-3">
                    <Toggle label="Enable direct QR ordering" description="Customers can place orders from the QR menu." checked={form.enableDirectQrOrdering} onChange={(value) => setForm({ ...form, enableDirectQrOrdering: value })} />
                    <Toggle label="Require customer name" description="Ask for a name before order submission." checked={form.requireCustomerName} onChange={(value) => setForm({ ...form, requireCustomerName: value })} />
                    <Toggle label="Require WhatsApp number" description="Ask for contact number during checkout." checked={form.requireCustomerWhatsApp} onChange={(value) => setForm({ ...form, requireCustomerWhatsApp: value })} />
                    <Toggle label="Enable waiter calls" description="Customers can request staff from the QR menu." checked={form.waiterCallEnabled} onChange={(value) => setForm({ ...form, waiterCallEnabled: value })} />

                    <div className="pt-2">
                      <Button type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {isSaving ? "Saving..." : "Save settings"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function Toggle({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant/70 bg-white p-4">
      <span>
        <span className="block text-sm font-bold text-on-surface">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-on-surface-variant">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-outline-variant text-primary" />
    </label>
  );
}

function toForm(settings: BranchOrderSettings): SaveBranchOrderSettingsInput {
  return {
    enableDirectQrOrdering: settings.enableDirectQrOrdering,
    requireCustomerName: settings.requireCustomerName,
    requireCustomerWhatsApp: settings.requireCustomerWhatsApp,
    waiterCallEnabled: settings.waiterCallEnabled
  };
}
