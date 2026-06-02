"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, BranchListItem, getBranches } from "./api";
import { clearAccessToken, getAccessToken } from "./auth";

export function useAdminWorkspace() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const activeBranches = useMemo(() => branches.filter((branch) => branch.isActive), [branches]);
  const selectedBranch = useMemo(
    () => activeBranches.find((branch) => branch.branchId === selectedBranchId) ?? activeBranches[0] ?? null,
    [activeBranches, selectedBranchId]
  );

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadBranches();
  }, [router]);

  async function loadBranches() {
    setIsLoadingBranches(true);
    setWorkspaceError(null);

    try {
      const response = await getBranches();
      setBranches(response);
      const firstActive = response.find((branch) => branch.isActive);
      setSelectedBranchId((current) => current || firstActive?.branchId || "");
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setIsLoadingBranches(false);
    }
  }

  function handleApiError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      clearAccessToken();
      router.replace("/admin/login");
      return;
    }

    setWorkspaceError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
  }

  function logout() {
    clearAccessToken();
    router.replace("/admin/login");
  }

  return {
    activeBranches,
    branches,
    handleApiError,
    isLoadingBranches,
    loadBranches,
    logout,
    selectedBranch,
    selectedBranchId,
    setSelectedBranchId,
    workspaceError,
    setWorkspaceError
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}
