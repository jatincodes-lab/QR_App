"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChefHat,
  CircleAlert,
  ClipboardList,
  MapPin,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Store,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { CountryPhoneInput } from "../../../components/country-phone-input";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import {
  ApiError,
  BranchListItem,
  CreateBranchInput,
  createBranch,
  getBranches,
  turnOffBranch
} from "../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../lib/auth";
import { firstInvalid, validateCountryCode, validateOptionalText, validatePhone, validateRequired } from "../../../lib/validation";

type BranchFormState = {
  name: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

const EmptyForm: BranchFormState = {
  name: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "IN"
};

export default function AdminBranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [form, setForm] = useState<BranchFormState>(EmptyForm);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchToTurnOff, setBranchToTurnOff] = useState<BranchListItem | null>(null);

  const activeBranches = useMemo(() => branches.filter((branch) => branch.isActive), [branches]);
  const visibleBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeBranches;
    }

    return activeBranches.filter((branch) =>
      [branch.name, branch.city, branch.phoneNumber, branch.countryCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [activeBranches, search]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadBranches();
  }, [router]);

  async function loadBranches() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getBranches();
      setBranches(response);
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const validation = validateBranchForm(form);
      if (!validation.isValid) {
        setError(validation.message);
        return;
      }

      const branch = await createBranch(toCreateInput(form));
      const isFirstBranch = activeBranches.length === 0;
      setBranches((current) => [branch, ...current]);
      setForm(EmptyForm);
      setShowAddBranch(false);
      if (isFirstBranch) {
        router.push(`/admin/branches/${branch.branchId}`);
        return;
      }

      setNotice("Branch added. You can manage menu and QR setup from this branch next.");
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTurnOffBranch() {
    if (!branchToTurnOff) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await turnOffBranch(branchToTurnOff.branchId);
      setBranches((current) => current.filter((branch) => branch.branchId !== branchToTurnOff.branchId));
      setNotice("Branch turned off.");
      setBranchToTurnOff(null);
    } catch (caught) {
      handleApiError(caught);
    }
  }

  function handleLogout() {
    clearAccessToken();
    router.replace("/admin/login");
  }

  function handleApiError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      router.replace("/admin/login");
      return;
    }

    setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
  }

  return (
    <AdminShell active="branches" onLogout={handleLogout} branchName={activeBranches[0]?.name ?? "Downtown Flagship"}>
      <div className="mx-auto max-w-7xl space-y-gutter">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge variant="secondary" className="gap-2 bg-primary/5 text-primary">
                <Store size={14} />
                Branch management
              </Badge>
              <h1 className="mt-4 text-headline-lg text-primary">Restaurant branches</h1>
              <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                Add each restaurant location, then manage menu, tables, and QR codes branch by branch.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => void loadBranches()} className="border-outline-variant/60 bg-white">
                <RefreshCw size={17} />
                Refresh
              </Button>
              <Button type="button" onClick={() => setShowAddBranch(true)} className="bg-primary text-on-primary shadow-soft-saas hover:bg-primary-container">
                <Plus size={18} />
                Add Branch
              </Button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <Metric icon={<Building2 size={20} />} label="Active branches" value={activeBranches.length.toString()} />
            <Metric icon={<Store size={20} />} label="Setup status" value={activeBranches.length > 0 ? "Ready" : "Pending"} />
            <Metric icon={<ChefHat size={20} />} label="Next step" value="Menu setup" />
          </section>

          {error ? (
            <DismissibleAlert variant="destructive" onClose={() => setError(null)}>
              {error}
            </DismissibleAlert>
          ) : null}

          {notice ? (
            <DismissibleAlert variant="success" onClose={() => setNotice(null)}>
              {notice}
            </DismissibleAlert>
          ) : null}

          <Card className="overflow-hidden border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-headline-md text-primary">Branch list</CardTitle>
                <CardDescription className="mt-1 text-on-surface-variant">Choose a branch to continue setup.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search branch, city, phone"
                  className="h-11 rounded-lg border-outline-variant/50 bg-surface-container-low pl-10"
                />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : activeBranches.length === 0 ? (
                <FirstBranchOnboarding onAdd={() => setShowAddBranch(true)} />
              ) : visibleBranches.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold">No matching branch found.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try another search term.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBranches.map((branch) => (
                      <TableRow key={branch.branchId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fixed-dim text-primary">
                              <Store size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface">{branch.name}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">Created {formatDate(branch.createdAtUtc)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-on-surface-variant">
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={16} />
                            {[branch.city, branch.countryCode].filter(Boolean).join(", ") || "Not added"}
                          </span>
                        </TableCell>
                        <TableCell className="text-on-surface-variant">{branch.phoneNumber || "Not added"}</TableCell>
                        <TableCell>
                          <Badge variant="success" className="bg-secondary-container/40 text-on-secondary-container">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/admin/branches/${branch.branchId}`)} className="border-outline-variant/60">
                              Manage
                              <ArrowRight size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setBranchToTurnOff(branch)}
                              className="h-9 w-9 border-destructive/30 text-destructive hover:bg-destructive/10"
                              aria-label={`Turn off ${branch.name}`}
                            >
                              <Power size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>

      {showAddBranch ? (
        <BranchDialog
          form={form}
          isSaving={isSaving}
          onCancel={() => setShowAddBranch(false)}
          onChange={setForm}
          onSubmit={handleCreateBranch}
        />
      ) : null}

      {branchToTurnOff ? (
        <ConfirmDialog
          branch={branchToTurnOff}
          onCancel={() => setBranchToTurnOff(null)}
          onConfirm={handleTurnOffBranch}
        />
      ) : null}
    </AdminShell>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="rounded-xl border border-outline-variant/40 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="flex min-h-[72px] items-center gap-4 px-5 py-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
            <p className="mt-0.5 truncate text-[22px] font-semibold leading-none text-on-surface">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DismissibleAlert({
  children,
  variant,
  onClose
}: {
  children: ReactNode;
  variant: "destructive" | "success";
  onClose: () => void;
}) {
  return (
    <Alert variant={variant} className="mt-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <CircleAlert size={18} className="mt-0.5 shrink-0" />
        <AlertDescription>{children}</AlertDescription>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0" aria-label="Close message">
        <X size={16} />
      </Button>
    </Alert>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 py-1">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-md border p-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="hidden h-9 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

function FirstBranchOnboarding({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="grid gap-6 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div>
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
          <Store size={24} />
        </div>
        <Badge variant="secondary" className="mt-5 bg-primary/5 text-primary">First setup step</Badge>
        <h2 className="mt-4 text-2xl font-extrabold text-primary">Create your first branch</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
          A branch is the restaurant location customers scan from. After this, you will add menu items, tables, QR links, and ordering settings.
        </p>
        <Button type="button" onClick={onAdd} className="mt-5 bg-primary text-on-primary">
          <Plus size={18} />
          Add First Branch
        </Button>
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
        <p className="text-sm font-extrabold text-on-surface">Setup path</p>
        <div className="mt-4 grid gap-3">
          <OnboardingStep icon={<Store size={18} />} title="Add branch" text="Create the physical restaurant location." active />
          <OnboardingStep icon={<ChefHat size={18} />} title="Build menu" text="Add categories and customer-facing items." />
          <OnboardingStep icon={<QrCode size={18} />} title="Create tables" text="Generate QR links for each table." />
          <OnboardingStep icon={<ClipboardList size={18} />} title="Go live" text="Receive orders and waiter calls in Kitchen." />
        </div>
      </div>
    </div>
  );
}

function OnboardingStep({ active = false, icon, text, title }: { active?: boolean; icon: ReactNode; text: string; title: string }) {
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${active ? "border-primary/20 bg-white" : "border-outline-variant/30 bg-white/70"}`}>
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-on-primary" : "bg-primary/5 text-primary"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">{text}</p>
      </div>
    </div>
  );
}

function BranchDialog({
  form,
  isSaving,
  onCancel,
  onChange,
  onSubmit
}: {
  form: BranchFormState;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: BranchFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <DialogHeader>
              <DialogTitle>Add branch</DialogTitle>
              <DialogDescription>Add the location customers will choose or scan from.</DialogDescription>
            </DialogHeader>
            <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 shrink-0" aria-label="Close">
              <X size={18} />
            </Button>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <TextInput label="Branch name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
            <CountryPhoneInput
              countryCode={form.countryCode}
              label="Phone number"
              value={form.phoneNumber}
              onChange={(value) => onChange({ ...form, phoneNumber: value })}
              onCountryChange={(countryCode, phoneNumber) => onChange({ ...form, countryCode, phoneNumber })}
            />
            <TextInput label="Address line 1" value={form.addressLine1} onChange={(value) => onChange({ ...form, addressLine1: value })} />
            <TextInput label="Address line 2" value={form.addressLine2} onChange={(value) => onChange({ ...form, addressLine2: value })} />
            <TextInput label="City" value={form.city} onChange={(value) => onChange({ ...form, city: value })} />
            <TextInput label="State" value={form.state} onChange={(value) => onChange({ ...form, state: value })} />
            <TextInput label="Postal code" value={form.postalCode} onChange={(value) => onChange({ ...form, postalCode: value })} />
          </div>

          <div className="flex justify-end gap-2 border-t bg-muted/40 p-5">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Plus size={18} />
              {isSaving ? "Adding..." : "Add Branch"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ branch, onCancel, onConfirm }: { branch: BranchListItem; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogContent className="max-w-md">
        <div className="p-5">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-destructive/10 text-destructive">
            <Power size={21} />
          </div>
          <DialogHeader className="mt-4">
            <DialogTitle>Turn off this branch?</DialogTitle>
            <DialogDescription className="leading-6">
              {branch.name} will stop showing in the active branch list. Customer-facing setup for this branch should be reviewed before turning it off.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex justify-end gap-2 border-t bg-muted/40 p-5">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            <Power size={18} />
            Turn off
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}

function toCreateInput(form: BranchFormState): CreateBranchInput {
  return {
    name: form.name,
    phoneNumber: optional(form.phoneNumber),
    addressLine1: optional(form.addressLine1),
    addressLine2: optional(form.addressLine2),
    city: optional(form.city),
    state: optional(form.state),
    postalCode: optional(form.postalCode),
    countryCode: form.countryCode
  };
}

function validateBranchForm(form: BranchFormState) {
  return firstInvalid(
    validateRequired(form.name, "Branch name"),
    validatePhone(form.phoneNumber, "Phone number"),
    validateOptionalText(form.addressLine1, "Address line 1"),
    validateOptionalText(form.addressLine2, "Address line 2"),
    validateOptionalText(form.city, "City", 120),
    validateOptionalText(form.state, "State", 120),
    validateOptionalText(form.postalCode, "Postal code", 20),
    validateCountryCode(form.countryCode)
  );
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
