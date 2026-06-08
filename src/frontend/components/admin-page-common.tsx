"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import type { BranchListItem } from "../lib/api";

export function BranchSelect({
  branches,
  selectedBranchId,
  onChange
}: {
  branches: BranchListItem[];
  selectedBranchId: string;
  onChange: (branchId: string) => void;
}) {
  if (branches.length === 0) {
    return null;
  }

  return (
    <label className="block min-w-[14rem]">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">Branch</span>
      <select
        value={selectedBranchId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-outline-variant/70 bg-white px-3 text-sm font-semibold text-on-surface outline-none focus:border-primary/30 focus:ring-2 focus:ring-ring/15"
      >
        {branches.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PageError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function EmptyBranchState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary-fixed text-primary">
          <Store size={24} />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-on-surface">Create a branch first</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
          Use the first setup flow to create a branch, menu item, table QR, and ordering rules together.
        </p>
        <Link
          href="/admin/setup"
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-container"
        >
          <Plus size={18} />
          Start setup
        </Link>
      </CardContent>
    </Card>
  );
}

export function PageLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MetricCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-28 items-center gap-4 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary-container text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
          <p className="mt-1 truncate text-2xl font-extrabold text-on-surface">{value}</p>
          {note ? <p className="mt-1 truncate text-xs text-on-surface-variant">{note}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
