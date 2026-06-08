"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, BranchListItem, getBranches } from "./api";
import { clearAccessToken, getAccessToken, getCurrentBranchId } from "./auth";

const SelectedBranchStorageKey = "qrapp.admin.selectedBranchId";

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
      const assignedBranchId = getCurrentBranchId();
      const visibleBranches = assignedBranchId ? response.filter((branch) => branch.branchId === assignedBranchId) : response;
      setBranches(visibleBranches);
      const firstActive = visibleBranches.find((branch) => branch.isActive);
      const storedBranchId = typeof window === "undefined" ? "" : window.localStorage.getItem(SelectedBranchStorageKey) ?? "";
      const storedBranch = visibleBranches.find((branch) => branch.isActive && branch.branchId === storedBranchId);
      setSelectedBranchId((current) => {
        const currentBranch = visibleBranches.find((branch) => branch.isActive && branch.branchId === current);
        return currentBranch?.branchId ?? storedBranch?.branchId ?? firstActive?.branchId ?? "";
      });
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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SelectedBranchStorageKey);
    }

    clearAccessToken();
    router.replace("/admin/login");
  }

  function selectBranch(branchId: string) {
    setSelectedBranchId(branchId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SelectedBranchStorageKey, branchId);
    }
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
    setSelectedBranchId: selectBranch,
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
