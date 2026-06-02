"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChefHat, IndianRupee, Layers3, Loader2, Pencil, Plus, Power, Save } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import {
  createMenuCategory,
  createMenuItem,
  deactivateMenuCategory,
  deactivateMenuItem,
  getMenuCategories,
  getMenuItems,
  updateMenuCategory,
  updateMenuItem,
  type MenuCategory,
  type MenuItem
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";

type ItemForm = {
  menuCategoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAltText: string;
  price: string;
  displayOrder: string;
  isAvailable: boolean;
};

type CategoryForm = {
  name: string;
  displayOrder: string;
};

const EmptyItemForm: ItemForm = {
  menuCategoryId: "",
  name: "",
  description: "",
  imageUrl: "",
  imageAltText: "",
  price: "",
  displayOrder: "1",
  isAvailable: true
};

const EmptyCategoryForm: CategoryForm = {
  name: "",
  displayOrder: "1"
};

export default function AdminMenuPage() {
  const workspace = useAdminWorkspace();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [itemForm, setItemForm] = useState<ItemForm>(EmptyItemForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryForm, setEditingCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<ItemForm>(EmptyItemForm);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);

  const availableItems = useMemo(() => items.filter((item) => item.isAvailable), [items]);
  const sortedCategories = useMemo(() => [...categories].sort((left, right) => left.displayOrder - right.displayOrder), [categories]);
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
      setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categoryResponse.length + 1) });
      setItemForm({
        ...EmptyItemForm,
        menuCategoryId: categoryResponse[0]?.menuCategoryId ?? "",
        displayOrder: String(itemResponse.length + 1)
      });
      setEditingCategoryId(null);
      setEditingCategoryForm(EmptyCategoryForm);
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingMenu(false);
    }
  }

  async function runSaving(key: string, action: () => Promise<void>) {
    setSavingKey(key);
    setMenuNotice(null);

    try {
      await action();
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving("category", async () => {
      const category = await createMenuCategory(workspace.selectedBranch!.branchId, {
        name: categoryForm.name.trim(),
        displayOrder: toPositiveNumber(categoryForm.displayOrder)
      });

      setCategories((current) => [...current, category]);
      setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categories.length + 2) });
      setItemForm((current) => ({
        ...current,
        menuCategoryId: current.menuCategoryId || category.menuCategoryId
      }));
      setMenuNotice("Menu category added.");
    });
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving("item", async () => {
      const item = await createMenuItem(workspace.selectedBranch!.branchId, {
        menuCategoryId: itemForm.menuCategoryId,
        name: itemForm.name.trim(),
        description: optional(itemForm.description),
        price: Number(itemForm.price),
        isAvailable: itemForm.isAvailable,
        displayOrder: toPositiveNumber(itemForm.displayOrder),
        imageUrl: optional(itemForm.imageUrl),
        imageAltText: optional(itemForm.imageAltText)
      });

      setItems((current) => [...current, item]);
      setItemForm((current) => ({
        ...EmptyItemForm,
        menuCategoryId: current.menuCategoryId,
        displayOrder: String(items.length + 2)
      }));
      setMenuNotice("Menu item added.");
    });
  }

  function handleStartEditCategory(category: MenuCategory) {
    setMenuNotice(null);
    setEditingCategoryId(category.menuCategoryId);
    setEditingCategoryForm({
      name: category.name,
      displayOrder: String(category.displayOrder)
    });
  }

  function handleCancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryForm(EmptyCategoryForm);
  }

  async function handleSaveCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`category-edit-${category.menuCategoryId}`, async () => {
      const updated = await updateMenuCategory(workspace.selectedBranch!.branchId, category.menuCategoryId, {
        name: editingCategoryForm.name.trim(),
        displayOrder: toPositiveNumber(editingCategoryForm.displayOrder),
        isActive: category.isActive
      });

      setCategories((current) => current.map((currentCategory) => (currentCategory.menuCategoryId === updated.menuCategoryId ? updated : currentCategory)));
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.menuCategoryId === updated.menuCategoryId ? { ...currentItem, categoryName: updated.name } : currentItem
        )
      );
      setEditingCategoryId(null);
      setEditingCategoryForm(EmptyCategoryForm);
      setMenuNotice("Menu category updated.");
    });
  }

  async function handleDeactivateCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`category-${category.menuCategoryId}`, async () => {
      await deactivateMenuCategory(workspace.selectedBranch!.branchId, category.menuCategoryId);
      setCategories((current) => current.filter((currentCategory) => currentCategory.menuCategoryId !== category.menuCategoryId));
      setItems((current) => current.filter((currentItem) => currentItem.menuCategoryId !== category.menuCategoryId));
      if (itemForm.menuCategoryId === category.menuCategoryId) {
        setItemForm((current) => ({
          ...current,
          menuCategoryId: categories.find((currentCategory) => currentCategory.menuCategoryId !== category.menuCategoryId)?.menuCategoryId ?? ""
        }));
      }
      if (editingCategoryId === category.menuCategoryId) {
        setEditingCategoryId(null);
        setEditingCategoryForm(EmptyCategoryForm);
      }
      setMenuNotice("Menu category turned off.");
    });
  }

  function handleStartEditItem(item: MenuItem) {
    setMenuNotice(null);
    setEditingItemId(item.menuItemId);
    setEditingItemForm({
      menuCategoryId: item.menuCategoryId,
      name: item.name,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      imageAltText: item.imageAltText ?? "",
      price: String(item.price),
      displayOrder: String(item.displayOrder),
      isAvailable: item.isAvailable
    });
  }

  function handleCancelEditItem() {
    setEditingItemId(null);
    setEditingItemForm(EmptyItemForm);
  }

  async function handleSaveItem(item: MenuItem) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`item-edit-${item.menuItemId}`, async () => {
      const updated = await updateMenuItem(workspace.selectedBranch!.branchId, item.menuItemId, {
        menuCategoryId: editingItemForm.menuCategoryId,
        name: editingItemForm.name.trim(),
        description: optional(editingItemForm.description),
        price: Number(editingItemForm.price),
        isAvailable: editingItemForm.isAvailable,
        isActive: item.isActive,
        displayOrder: toPositiveNumber(editingItemForm.displayOrder),
        imageUrl: optional(editingItemForm.imageUrl),
        imageAltText: optional(editingItemForm.imageAltText)
      });

      setItems((current) => current.map((currentItem) => (currentItem.menuItemId === updated.menuItemId ? updated : currentItem)));
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
      setMenuNotice("Menu item updated.");
    });
  }

  async function handleDeactivateItem(item: MenuItem) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`item-${item.menuItemId}`, async () => {
      await deactivateMenuItem(workspace.selectedBranch!.branchId, item.menuItemId);
      setItems((current) => current.filter((currentItem) => currentItem.menuItemId !== item.menuItemId));
      if (editingItemId === item.menuItemId) {
        setEditingItemId(null);
        setEditingItemForm(EmptyItemForm);
      }
      setMenuNotice("Menu item turned off.");
    });
  }

  const branchName = workspace.selectedBranch?.name ?? "Menu";

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
              Review categories, item images, and availability for the branch selected in the top nav.
            </p>
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
              <CardHeader>
                <div>
                  <CardTitle>Menu setup</CardTitle>
                  <CardDescription>Add categories and customer-facing items for {workspace.selectedBranch.name}.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {menuNotice ? (
                  <div className="rounded-lg border border-primary/20 bg-primary-fixed px-4 py-3 text-sm font-semibold text-primary">
                    {menuNotice}
                  </div>
                ) : null}
                {isLoadingMenu ? (
                  <PageLoading />
                ) : (
                  <>
                    <section className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-extrabold text-on-surface">Categories</h3>
                          <p className="mt-1 text-sm text-on-surface-variant">Create and organize groups before adding items.</p>
                        </div>
                        <Badge variant="secondary">{categories.length} active</Badge>
                      </div>

                      <form onSubmit={handleCreateCategory} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                        <Field label="Category name">
                          <Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required />
                        </Field>
                        <Field label="Order">
                          <Input type="number" min="1" value={categoryForm.displayOrder} onChange={(event) => setCategoryForm({ ...categoryForm, displayOrder: event.target.value })} required />
                        </Field>
                        <Button type="submit" disabled={savingKey === "category"} className="self-end">
                          {savingKey === "category" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                          Add
                        </Button>
                      </form>

                      {sortedCategories.length > 0 ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {sortedCategories.map((category) => (
                            <div key={category.menuCategoryId} className="rounded-lg border border-outline-variant/30 bg-white p-3">
                              {editingCategoryId === category.menuCategoryId ? (
                                <div className="grid gap-3">
                                  <Field label="Category name">
                                    <Input value={editingCategoryForm.name} onChange={(event) => setEditingCategoryForm({ ...editingCategoryForm, name: event.target.value })} required />
                                  </Field>
                                  <Field label="Order">
                                    <Input type="number" min="1" value={editingCategoryForm.displayOrder} onChange={(event) => setEditingCategoryForm({ ...editingCategoryForm, displayOrder: event.target.value })} required />
                                  </Field>
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEditCategory}>
                                      Cancel
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => handleSaveCategory(category)} disabled={savingKey === `category-edit-${category.menuCategoryId}`}>
                                      {savingKey === `category-edit-${category.menuCategoryId}` ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-on-surface">{category.name}</p>
                                    <p className="mt-1 text-xs text-on-surface-variant">Order {category.displayOrder}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button type="button" variant="outline" size="icon" onClick={() => handleStartEditCategory(category)} className="h-8 w-8 border-outline-variant/60" aria-label={`Edit ${category.name}`}>
                                      <Pencil size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleDeactivateCategory(category)}
                                      disabled={savingKey === `category-${category.menuCategoryId}`}
                                      className="h-8 w-8 border-destructive/30 text-destructive"
                                      aria-label={`Turn off ${category.name}`}
                                    >
                                      {savingKey === `category-${category.menuCategoryId}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>

                    <form onSubmit={handleCreateItem} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 lg:grid-cols-2">
                      <Field label="Category">
                        <select
                          value={itemForm.menuCategoryId}
                          onChange={(event) => setItemForm({ ...itemForm, menuCategoryId: event.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          required
                          disabled={categories.length === 0}
                        >
                          {categories.length === 0 ? <option value="">Add a category first</option> : null}
                          {sortedCategories.map((category) => (
                            <option key={category.menuCategoryId} value={category.menuCategoryId}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Item name">
                        <Input value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} required />
                      </Field>
                      <Field label="Description">
                        <Input value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} />
                      </Field>
                      <Field label="Item image URL">
                        <Input value={itemForm.imageUrl} onChange={(event) => setItemForm({ ...itemForm, imageUrl: event.target.value })} placeholder="https://..." />
                      </Field>
                      <Field label="Image alt text">
                        <Input value={itemForm.imageAltText} onChange={(event) => setItemForm({ ...itemForm, imageAltText: event.target.value })} />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                        <Field label="Price">
                          <Input type="number" min="0.01" step="0.01" value={itemForm.price} onChange={(event) => setItemForm({ ...itemForm, price: event.target.value })} required />
                        </Field>
                        <Field label="Order">
                          <Input type="number" min="1" value={itemForm.displayOrder} onChange={(event) => setItemForm({ ...itemForm, displayOrder: event.target.value })} required />
                        </Field>
                      </div>
                      <label className="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface">
                        <input
                          type="checkbox"
                          checked={itemForm.isAvailable}
                          onChange={(event) => setItemForm({ ...itemForm, isAvailable: event.target.checked })}
                          className="h-4 w-4 rounded border-outline-variant text-primary"
                        />
                        Available
                      </label>
                      <Button type="submit" disabled={savingKey === "item" || categories.length === 0} className="justify-self-start">
                        {savingKey === "item" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                        Add Item
                      </Button>
                    </form>

                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                        <p className="text-sm font-bold text-on-surface">No menu items yet.</p>
                        <p className="mt-1 text-sm text-on-surface-variant">Add a category, then add your first item above.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.menuItemId}>
                              {editingItemId === item.menuItemId ? (
                                <TableCell colSpan={5} className="bg-surface-container-low/70">
                                  <div className="grid gap-3 lg:grid-cols-2">
                                    <Field label="Category">
                                      <select
                                        value={editingItemForm.menuCategoryId}
                                        onChange={(event) => setEditingItemForm({ ...editingItemForm, menuCategoryId: event.target.value })}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        required
                                      >
                                        {sortedCategories.map((category) => (
                                          <option key={category.menuCategoryId} value={category.menuCategoryId}>
                                            {category.name}
                                          </option>
                                        ))}
                                      </select>
                                    </Field>
                                    <Field label="Item name">
                                      <Input value={editingItemForm.name} onChange={(event) => setEditingItemForm({ ...editingItemForm, name: event.target.value })} required />
                                    </Field>
                                    <Field label="Description">
                                      <Input value={editingItemForm.description} onChange={(event) => setEditingItemForm({ ...editingItemForm, description: event.target.value })} />
                                    </Field>
                                    <Field label="Item image URL">
                                      <Input value={editingItemForm.imageUrl} onChange={(event) => setEditingItemForm({ ...editingItemForm, imageUrl: event.target.value })} placeholder="https://..." />
                                    </Field>
                                    <Field label="Image alt text">
                                      <Input value={editingItemForm.imageAltText} onChange={(event) => setEditingItemForm({ ...editingItemForm, imageAltText: event.target.value })} />
                                    </Field>
                                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                                      <Field label="Price">
                                        <Input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={editingItemForm.price}
                                          onChange={(event) => setEditingItemForm({ ...editingItemForm, price: event.target.value })}
                                          required
                                        />
                                      </Field>
                                      <Field label="Order">
                                        <Input
                                          type="number"
                                          min="1"
                                          value={editingItemForm.displayOrder}
                                          onChange={(event) => setEditingItemForm({ ...editingItemForm, displayOrder: event.target.value })}
                                          required
                                        />
                                      </Field>
                                    </div>
                                    <label className="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface">
                                      <input
                                        type="checkbox"
                                        checked={editingItemForm.isAvailable}
                                        onChange={(event) => setEditingItemForm({ ...editingItemForm, isAvailable: event.target.checked })}
                                        className="h-4 w-4 rounded border-outline-variant text-primary"
                                      />
                                      Available
                                    </label>
                                    <div className="flex flex-wrap justify-end gap-2">
                                      <Button type="button" variant="outline" onClick={handleCancelEditItem}>
                                        Cancel
                                      </Button>
                                      <Button type="button" onClick={() => handleSaveItem(item)} disabled={savingKey === `item-edit-${item.menuItemId}`}>
                                        {savingKey === `item-edit-${item.menuItemId}` ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              ) : (
                                <>
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
                                  <TableCell>
                                    <div className="flex justify-end gap-2">
                                      <Button type="button" variant="outline" size="icon" onClick={() => handleStartEditItem(item)} className="h-8 w-8 border-outline-variant/60" aria-label={`Edit ${item.name}`}>
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDeactivateItem(item)}
                                        disabled={savingKey === `item-${item.menuItemId}`}
                                        className="h-8 w-8 border-destructive/30 text-destructive"
                                        aria-label={`Turn off ${item.name}`}
                                      >
                                        {savingKey === `item-${item.menuItemId}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</Label>
      {children}
    </div>
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

function toPositiveNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}
