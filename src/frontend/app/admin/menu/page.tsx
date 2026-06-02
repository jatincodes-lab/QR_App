"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChefHat, IndianRupee, Layers3, Plus } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { getMenuCategories, getMenuItems, type MenuCategory, type MenuItem } from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";

export default function AdminMenuPage() {
  const workspace = useAdminWorkspace();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  const availableItems = useMemo(() => items.filter((item) => item.isAvailable), [items]);
  const averagePrice = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    return items.reduce((total, item) => total + item.price, 0) / items.length;
  }, [items]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setCategories([]);
      setItems([]);
      return;
    }

    void loadMenu(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  async function loadMenu(branchId: string) {
    setIsLoadingMenu(true);

    try {
      const [categoryResponse, itemResponse] = await Promise.all([getMenuCategories(branchId), getMenuItems(branchId)]);
      setCategories(categoryResponse);
      setItems(itemResponse);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingMenu(false);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Menu";
  const editorHref = workspace.selectedBranch ? `/admin/branches/${workspace.selectedBranch.branchId}?tab=menu` : "/admin/branches";

  return (
    <AdminShell
      active="menu"
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
              <ChefHat size={14} />
              Menu
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Menu workspace</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Review categories and items for a branch. Use the full editor when you need add/edit controls.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Button type="button" onClick={() => (window.location.href = editorHref)}>
              <Plus size={18} />
              Open editor
            </Button>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<Layers3 size={20} />} label="Categories" value={isLoadingMenu ? "..." : String(categories.length)} />
              <MetricCard icon={<ChefHat size={20} />} label="Menu items" value={isLoadingMenu ? "..." : String(items.length)} />
              <MetricCard icon={<IndianRupee size={20} />} label="Average price" value={isLoadingMenu ? "..." : formatMoney(averagePrice)} note={`${availableItems.length} available`} />
            </section>

            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>Current active menu items for {workspace.selectedBranch.name}.</CardDescription>
                </div>
                <Link href={editorHref} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Manage menu
                  <ArrowRight size={16} />
                </Link>
              </CardHeader>
              <CardContent>
                {isLoadingMenu ? (
                  <PageLoading />
                ) : items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                    <p className="text-sm font-bold text-on-surface">No menu items yet.</p>
                    <p className="mt-1 text-sm text-on-surface-variant">Open the branch editor to create categories and items.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.menuItemId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <MenuItemImage imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} />
                              <div className="min-w-0">
                                <p className="font-bold text-on-surface">{item.name}</p>
                                <p className="mt-1 line-clamp-1 text-xs text-on-surface-variant">{item.description || "No description"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-on-surface-variant">{item.categoryName}</TableCell>
                          <TableCell className="font-bold text-primary">{formatMoney(item.price)}</TableCell>
                          <TableCell>
                            <Badge variant={item.isAvailable ? "success" : "outline"}>{item.isAvailable ? "Available" : "Hidden"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function MenuItemImage({ imageAltText, imageUrl, name }: { imageAltText: string | null; imageUrl: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary-container text-sm font-black text-primary">
      {imageUrl ? <img src={imageUrl} alt={imageAltText ?? name} className="h-full w-full object-cover" /> : initials || <ChefHat size={18} />}
    </div>
  );
}
