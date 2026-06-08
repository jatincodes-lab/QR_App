"use client";

import { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Save, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { createStaffUser, getStaffUsers, updateStaffUser, type StaffRoleCode, type StaffUser } from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { getCurrentRoleCode } from "../../../lib/auth";
import { firstInvalid, validateEmail, validatePassword, validateRequired } from "../../../lib/validation";

type StaffForm = {
  branchId: string;
  email: string;
  displayName: string;
  password: string;
  roleCode: StaffRoleCode;
};

const DefaultForm: StaffForm = {
  branchId: "",
  email: "",
  displayName: "",
  password: "",
  roleCode: "kitchen"
};

const RoleOptions: Array<{ value: StaffRoleCode; label: string; helper: string }> = [
  { value: "manager", label: "Manager", helper: "Menu, orders, customers, reports" },
  { value: "admin", label: "Admin", helper: "Operations access except staff settings" },
  { value: "kitchen", label: "Kitchen", helper: "Kitchen and order boards" },
  { value: "waiter", label: "Waiter", helper: "Orders, waiter calls, branch controls" },
  { value: "staff", label: "Staff", helper: "Basic order operations" }
];

export default function AdminStaffPage() {
  const workspace = useAdminWorkspace();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState<StaffForm>(DefaultForm);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const roleCode = getCurrentRoleCode();
  const isOwner = roleCode === "owner";
  const branchName = workspace.selectedBranch?.name ?? "Staff";

  useEffect(() => {
    if (!workspace.isLoadingBranches && workspace.activeBranches.length > 0 && !form.branchId) {
      setForm((current) => ({ ...current, branchId: workspace.selectedBranchId || workspace.activeBranches[0].branchId }));
    }
  }, [workspace.isLoadingBranches, workspace.activeBranches.length, workspace.selectedBranchId]);

  useEffect(() => {
    if (isOwner) {
      void loadStaff();
    }
  }, [isOwner]);

  async function loadStaff() {
    setIsLoadingStaff(true);
    setNotice(null);
    try {
      setStaffUsers(await getStaffUsers(true));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingStaff(false);
    }
  }

  async function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = firstInvalid(
      validateRequired(form.displayName, "Display name", 160),
      validateEmail(form.email),
      validatePassword(form.password)
    );

    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    setIsSaving(true);
    setNotice(null);
    try {
      const created = await createStaffUser({
        branchId: form.branchId || null,
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
        roleCode: form.roleCode
      });
      setStaffUsers((current) => [created, ...current]);
      setForm({ ...DefaultForm, branchId: form.branchId });
      setNotice("Staff user created.");
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStaff(user: StaffUser) {
    if (user.roleCode === "owner") {
      return;
    }

    try {
      const updated = await updateStaffUser(user.userId, {
        branchId: user.branchId,
        displayName: user.displayName,
        roleCode: user.roleCode,
        isActive: !user.isActive
      });
      setStaffUsers((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
    } catch (caught) {
      workspace.handleApiError(caught);
    }
  }

  const activeStaffCount = staffUsers.filter((user) => user.roleCode !== "owner" && user.isActive && user.tenantUserIsActive).length;
  const branchAssignedCount = staffUsers.filter((user) => user.roleCode !== "owner" && user.branchId).length;

  return (
    <AdminShell
      active="staff"
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
              <UserCog size={14} />
              Staff
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Staff access</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Create separate logins for managers, kitchen staff, and waiters.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={loadStaff} disabled={isLoadingStaff || !isOwner}>
            {isLoadingStaff ? <RefreshCw size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            Refresh
          </Button>
        </header>

        <PageError message={workspace.workspaceError} />
        {notice ? <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{notice}</div> : null}

        {!isOwner ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldCheck size={30} className="mx-auto text-on-surface-variant" />
              <p className="mt-3 font-extrabold text-on-surface">Owner access required</p>
              <p className="mt-1 text-sm text-on-surface-variant">Only owner accounts can create or update staff users.</p>
            </CardContent>
          </Card>
        ) : workspace.isLoadingBranches ? (
          <PageLoading />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<Users size={20} />} label="Total users" value={String(staffUsers.length)} />
              <MetricCard icon={<ShieldCheck size={20} />} label="Active staff" value={String(activeStaffCount)} />
              <MetricCard icon={<UserCog size={20} />} label="Branch assigned" value={String(branchAssignedCount)} />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Add staff user</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitStaff} className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Name</span>
                    <Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="h-11 bg-white" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Email</span>
                    <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" className="h-11 bg-white" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Password</span>
                    <Input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" className="h-11 bg-white" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Role</span>
                    <select value={form.roleCode} onChange={(event) => setForm({ ...form, roleCode: event.target.value as StaffRoleCode })} className="h-11 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none">
                      {RoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </label>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <RefreshCw size={17} className="animate-spin" /> : <UserPlus size={17} />}
                    Add
                  </Button>
                  <label className="grid gap-2 lg:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Assigned branch</span>
                    <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} className="h-11 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none">
                      <option value="">All branches</option>
                      {workspace.activeBranches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                    </select>
                  </label>
                  <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant lg:col-span-3">
                    {RoleOptions.find((role) => role.value === form.roleCode)?.helper}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? <PageLoading /> : <StaffList users={staffUsers} onToggle={toggleStaff} />}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function StaffList({ users, onToggle }: { users: StaffUser[]; onToggle: (user: StaffUser) => void }) {
  if (users.length === 0) {
    return <div className="rounded-xl border border-dashed border-outline-variant/70 p-8 text-center text-sm font-semibold text-on-surface-variant">No staff users yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/70">
      <div className="hidden grid-cols-[1fr_0.7fr_0.8fr_0.5fr_auto] gap-4 border-b border-outline-variant/70 bg-surface-container-low px-4 py-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant lg:grid">
        <span>User</span>
        <span>Role</span>
        <span>Branch</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      <div className="divide-y divide-outline-variant/70">
        {users.map((user) => (
          <div key={user.userId} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_0.7fr_0.8fr_0.5fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-on-surface">{user.displayName}</p>
              <p className="mt-1 truncate text-sm text-on-surface-variant">{user.email}</p>
            </div>
            <Badge variant={user.roleCode === "owner" ? "secondary" : "outline"} className="w-fit">{roleLabel(user.roleCode)}</Badge>
            <p className="text-sm font-semibold text-on-surface">{user.branchName ?? "All branches"}</p>
            <Badge variant={user.isActive && user.tenantUserIsActive ? "secondary" : "outline"} className="w-fit">{user.isActive && user.tenantUserIsActive ? "Active" : "Off"}</Badge>
            <Button type="button" variant="outline" size="sm" disabled={user.roleCode === "owner"} onClick={() => onToggle(user)}>
              <Save size={15} />
              {user.isActive ? "Turn off" : "Turn on"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function roleLabel(roleCode: StaffUser["roleCode"]) {
  return RoleOptions.find((role) => role.value === roleCode)?.label ?? "Owner";
}
