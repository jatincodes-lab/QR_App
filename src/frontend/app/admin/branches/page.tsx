"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChefHat,
  CircleAlert,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Store,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
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
      const branch = await createBranch(toCreateInput(form));
      setBranches((current) => [branch, ...current]);
      setForm(EmptyForm);
      setShowAddBranch(false);
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
        <aside className="border-b bg-card lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center justify-between px-4 lg:h-full lg:min-h-screen lg:flex-col lg:items-stretch lg:px-4 lg:py-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">QR Menu Admin</p>
                  <p className="text-xs text-muted-foreground">Restaurant workspace</p>
                </div>
              </div>

              <nav className="mt-8 hidden space-y-1 lg:block">
                <NavItem active icon={<LayoutDashboard size={18} />} label="Branches" />
                <NavItem icon={<ChefHat size={18} />} label="Menu" disabled />
                <NavItem icon={<QrCode size={18} />} label="Tables & QR" disabled />
                <NavItem icon={<Settings size={18} />} label="Settings" disabled />
              </nav>
            </div>

            <Button type="button" variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut size={17} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </aside>

        <section className="px-4 py-5 lg:px-8 lg:py-7">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge variant="secondary" className="gap-2">
                <Store size={14} />
                Branch management
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal">Restaurant branches</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Add each restaurant location, then manage menu, tables, and QR codes branch by branch.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => void loadBranches()}>
                <RefreshCw size={17} />
                Refresh
              </Button>
              <Button type="button" onClick={() => setShowAddBranch(true)}>
                <Plus size={18} />
                Add Branch
              </Button>
            </div>
          </header>

          <section className="mt-6 grid gap-3 md:grid-cols-3">
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

          <Card className="mt-6">
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg">Branch list</CardTitle>
                <CardDescription className="mt-1">Choose a branch to continue setup.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search branch, city, phone"
                  className="pl-10"
                />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <LoadingState />
              ) : activeBranches.length === 0 ? (
                <EmptyState onAdd={() => setShowAddBranch(true)} />
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
                            <div className="grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground">
                              <Store size={18} />
                            </div>
                            <div>
                              <p className="font-medium">{branch.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(branch.createdAtUtc)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={16} />
                            {[branch.city, branch.countryCode].filter(Boolean).join(", ") || "Not added"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{branch.phoneNumber || "Not added"}</TableCell>
                        <TableCell>
                          <Badge variant="success">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setNotice("Branch detail, menu, and QR setup are next.")}>
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
        </section>
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
    </main>
  );
}

function NavItem({ icon, label, active = false, disabled = false }: { icon: ReactNode; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <div
      className={[
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground",
        disabled ? "opacity-60" : ""
      ].join(" ")}
    >
      {icon}
      {label}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border bg-muted text-muted-foreground">{icon}</div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
        <Store size={24} />
      </div>
      <p className="mt-4 text-base font-semibold">No branches yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Add your first restaurant location. After that you can create menu items, tables, and QR codes for customers.
      </p>
      <Button type="button" onClick={onAdd} className="mt-5">
        <Plus size={18} />
        Add Branch
      </Button>
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
            <TextInput label="Phone number" value={form.phoneNumber} onChange={(value) => onChange({ ...form, phoneNumber: value })} />
            <TextInput label="Address line 1" value={form.addressLine1} onChange={(value) => onChange({ ...form, addressLine1: value })} />
            <TextInput label="Address line 2" value={form.addressLine2} onChange={(value) => onChange({ ...form, addressLine2: value })} />
            <TextInput label="City" value={form.city} onChange={(value) => onChange({ ...form, city: value })} />
            <TextInput label="State" value={form.state} onChange={(value) => onChange({ ...form, state: value })} />
            <TextInput label="Postal code" value={form.postalCode} onChange={(value) => onChange({ ...form, postalCode: value })} />
            <TextInput
              label="Country code"
              value={form.countryCode}
              onChange={(value) => onChange({ ...form, countryCode: value.toUpperCase().slice(0, 2) })}
              required
            />
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

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
