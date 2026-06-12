"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChefHat, IndianRupee, Layers3, Loader2, Pencil, Plus, Power, Save } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { MenuItemImagePicker } from "../../../components/menu-item-image-picker";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
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
import { firstInvalid, validateMoney, validateOptionalText, validatePositiveInteger, validateRequired } from "../../../lib/validation";

type ItemForm = {
  menuCategoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAltText: string;
  price: string;
  displayOrder: string;
  isAvailable: boolean;
  variants: ItemVariantForm[];
};

type ItemVariantForm = {
  menuItemVariantId: string | null;
  name: string;
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
  isAvailable: true,
  variants: []
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
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
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
      setIsCategoryDialogOpen(false);
      setIsItemDialogOpen(false);
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

    const validation = validateCategoryForm(categoryForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
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
      setIsCategoryDialogOpen(false);
    });
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateItemForm(itemForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving("item", async () => {
      const item = await createMenuItem(workspace.selectedBranch!.branchId, {
        menuCategoryId: itemForm.menuCategoryId,
        name: itemForm.name.trim(),
        description: optional(itemForm.description),
        price: getItemFormPrice(itemForm),
        isAvailable: itemForm.isAvailable,
        displayOrder: toPositiveNumber(itemForm.displayOrder),
        imageUrl: optional(itemForm.imageUrl),
        imageAltText: itemForm.imageUrl ? optional(itemForm.imageAltText) ?? itemForm.name.trim() : null,
        variants: toVariantInput(itemForm.variants)
      });

      setItems((current) => [...current, item]);
      setItemForm((current) => ({
        ...EmptyItemForm,
        menuCategoryId: current.menuCategoryId,
        displayOrder: String(items.length + 2)
      }));
      setMenuNotice("Menu item added.");
      setIsItemDialogOpen(false);
    });
  }

  function handleOpenCreateCategory() {
    setMenuNotice(null);
    setEditingCategoryId(null);
    setEditingCategoryForm(EmptyCategoryForm);
    setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categories.length + 1) });
    setIsCategoryDialogOpen(true);
  }

  function handleStartEditCategory(category: MenuCategory) {
    setMenuNotice(null);
    setEditingCategoryId(category.menuCategoryId);
    setEditingCategoryForm({
      name: category.name,
      displayOrder: String(category.displayOrder)
    });
    setIsCategoryDialogOpen(true);
  }

  function handleCancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryForm(EmptyCategoryForm);
    setIsCategoryDialogOpen(false);
  }

  async function handleSaveCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateCategoryForm(editingCategoryForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
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
      setIsCategoryDialogOpen(false);
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

  function handleOpenCreateItem() {
    setMenuNotice(null);
    setEditingItemId(null);
    setEditingItemForm(EmptyItemForm);
    setItemForm((current) => ({
      ...EmptyItemForm,
      menuCategoryId: current.menuCategoryId || sortedCategories[0]?.menuCategoryId || "",
      displayOrder: String(items.length + 1)
    }));
    setIsItemDialogOpen(true);
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
      isAvailable: item.isAvailable,
      variants: (item.variants ?? []).map((variant) => ({
        menuItemVariantId: variant.menuItemVariantId,
        name: variant.name,
        price: String(variant.price),
        displayOrder: String(variant.displayOrder),
        isAvailable: variant.isAvailable
      }))
    });
    setIsItemDialogOpen(true);
  }

  function handleCancelEditItem() {
    setEditingItemId(null);
    setEditingItemForm(EmptyItemForm);
    setIsItemDialogOpen(false);
  }

  async function handleSaveItem(item: MenuItem) {
    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateItemForm(editingItemForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving(`item-edit-${item.menuItemId}`, async () => {
      const updated = await updateMenuItem(workspace.selectedBranch!.branchId, item.menuItemId, {
        menuCategoryId: editingItemForm.menuCategoryId,
        name: editingItemForm.name.trim(),
        description: optional(editingItemForm.description),
        price: getItemFormPrice(editingItemForm),
        isAvailable: editingItemForm.isAvailable,
        isActive: item.isActive,
        displayOrder: toPositiveNumber(editingItemForm.displayOrder),
        imageUrl: optional(editingItemForm.imageUrl),
        imageAltText: editingItemForm.imageUrl ? optional(editingItemForm.imageAltText) ?? editingItemForm.name.trim() : null,
        variants: toVariantInput(editingItemForm.variants)
      });

      setItems((current) => current.map((currentItem) => (currentItem.menuItemId === updated.menuItemId ? updated : currentItem)));
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
      setMenuNotice("Menu item updated.");
      setIsItemDialogOpen(false);
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
  const editingCategory = editingCategoryId ? categories.find((category) => category.menuCategoryId === editingCategoryId) ?? null : null;
  const editingItem = editingItemId ? items.find((item) => item.menuItemId === editingItemId) ?? null : null;
  const isEditingCategory = Boolean(editingCategory);
  const isEditingItem = Boolean(editingItem);
  const activeItemForm = isEditingItem ? editingItemForm : itemForm;
  const activeItemHasVariants = activeItemForm.variants.length > 0;
  const activeItemDerivedPrice = activeItemHasVariants ? getItemFormPrice(activeItemForm) : null;

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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Menu setup</CardTitle>
                    <CardDescription>Add categories and customer-facing items for {workspace.selectedBranch.name}.</CardDescription>
                  </div>
                  <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <Button type="button" variant="outline" onClick={handleOpenCreateCategory} disabled={isLoadingMenu} className="w-full sm:w-auto">
                      <Plus size={17} />
                      Add Category
                    </Button>
                    <Button type="button" onClick={handleOpenCreateItem} disabled={isLoadingMenu || categories.length === 0} className="w-full sm:w-auto">
                      <Plus size={17} />
                      Add Item
                    </Button>
                  </div>
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

                      {sortedCategories.length > 0 ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {sortedCategories.map((category) => (
                            <div key={category.menuCategoryId} className="rounded-lg border border-outline-variant/30 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-on-surface">{category.name}</p>
                                  <p className="mt-1 text-xs text-on-surface-variant">Order {category.displayOrder}</p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="outline" size="icon" onClick={() => handleStartEditCategory(category)} className="border-outline-variant/60" aria-label={`Edit ${category.name}`}>
                                    <Pencil size={14} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeactivateCategory(category)}
                                    disabled={savingKey === `category-${category.menuCategoryId}`}
                    className="border-destructive/30 text-destructive"
                                    aria-label={`Turn off ${category.name}`}
                                  >
                                    {savingKey === `category-${category.menuCategoryId}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-outline-variant/70 bg-white p-6 text-center text-sm font-semibold text-on-surface-variant">
                          Add a category to organize menu items.
                        </div>
                      )}
                    </section>

                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                        <p className="text-sm font-bold text-on-surface">No menu items yet.</p>
                        <p className="mt-1 text-sm text-on-surface-variant">Add a category, then add your first item above.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 md:hidden">
                          {items.map((item) => (
                            <MenuItemMobileCard
                              key={item.menuItemId}
                              item={item}
                              savingKey={savingKey}
                              onDeactivate={handleDeactivateItem}
                              onEdit={handleStartEditItem}
                            />
                          ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
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
                                      <Button type="button" variant="outline" size="icon" onClick={() => handleStartEditItem(item)} className="border-outline-variant/60" aria-label={`Edit ${item.name}`}>
                                        <Pencil size={14} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDeactivateItem(item)}
                                        disabled={savingKey === `item-${item.menuItemId}`}
                                        className="border-destructive/30 text-destructive"
                                        aria-label={`Turn off ${item.name}`}
                                      >
                                        {savingKey === `item-${item.menuItemId}` ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {isCategoryDialogOpen ? (
              <Dialog>
                <DialogContent className="max-w-lg p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle>{isEditingCategory ? "Edit category" : "Add category"}</DialogTitle>
                    <DialogDescription>{isEditingCategory ? "Update the category details shown on the menu." : "Create a category before adding menu items."}</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(event) => {
                      if (editingCategory) {
                        event.preventDefault();
                        void handleSaveCategory(editingCategory);
                        return;
                      }

                      void handleCreateCategory(event);
                    }}
                    className="mt-5 grid gap-4"
                  >
                    <Field label="Category name">
                      <Input
                        value={isEditingCategory ? editingCategoryForm.name : categoryForm.name}
                        onChange={(event) =>
                          isEditingCategory
                            ? setEditingCategoryForm({ ...editingCategoryForm, name: event.target.value })
                            : setCategoryForm({ ...categoryForm, name: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field label="Order">
                      <Input
                        type="number"
                        min="1"
                        value={isEditingCategory ? editingCategoryForm.displayOrder : categoryForm.displayOrder}
                        onChange={(event) =>
                          isEditingCategory
                            ? setEditingCategoryForm({ ...editingCategoryForm, displayOrder: event.target.value })
                            : setCategoryForm({ ...categoryForm, displayOrder: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <div className="grid gap-2 sm:flex sm:justify-end">
                      <Button type="button" variant="outline" onClick={handleCancelEditCategory} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingKey === "category" || (editingCategory ? savingKey === `category-edit-${editingCategory.menuCategoryId}` : false)} className="w-full sm:w-auto">
                        {savingKey === "category" || (editingCategory ? savingKey === `category-edit-${editingCategory.menuCategoryId}` : false) ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : isEditingCategory ? (
                          <Save size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                        {isEditingCategory ? "Update" : "Add Category"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            {isItemDialogOpen ? (
              <Dialog>
                <DialogContent className="flex max-h-[calc(100vh-1rem)] w-[min(96vw,56rem)] max-w-none flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]">
                  <div className="shrink-0 border-b border-outline-variant/70 bg-surface-container-low px-4 py-4 sm:px-6 sm:py-5">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black text-on-surface">{isEditingItem ? "Edit menu item" : "Add menu item"}</DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm font-semibold text-on-surface-variant">
                        {isEditingItem ? "Update the item details customers see on the QR menu." : "Create a menu item with image, pricing, availability, and optional portion sizes."}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <form
                    onSubmit={(event) => {
                      if (editingItem) {
                        event.preventDefault();
                        void handleSaveItem(editingItem);
                        return;
                      }

                      void handleCreateItem(event);
                    }}
                    className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
                  >
                    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4 [scrollbar-width:none] sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-scrollbar]:hidden">
                      <div className="grid w-full min-w-0 gap-4 rounded-xl border border-outline-variant/70 bg-white p-4">
                        <div className="grid gap-4">
                          <Field label="Category">
                            <select
                              value={isEditingItem ? editingItemForm.menuCategoryId : itemForm.menuCategoryId}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, menuCategoryId: event.target.value })
                                  : setItemForm({ ...itemForm, menuCategoryId: event.target.value })
                              }
                              className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
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
                            <Input
                              className="h-11 bg-white font-semibold"
                              value={isEditingItem ? editingItemForm.name : itemForm.name}
                              onChange={(event) =>
                                isEditingItem ? setEditingItemForm({ ...editingItemForm, name: event.target.value }) : setItemForm({ ...itemForm, name: event.target.value })
                              }
                              placeholder="Masala tea"
                              required
                            />
                          </Field>
                        </div>
                        <Field label="Description">
                          <textarea
                            value={isEditingItem ? editingItemForm.description : itemForm.description}
                            onChange={(event) =>
                              isEditingItem
                                ? setEditingItemForm({ ...editingItemForm, description: event.target.value })
                                : setItemForm({ ...itemForm, description: event.target.value })
                            }
                            placeholder="Short description shown to customers"
                            className="min-h-20 w-full resize-y rounded-lg border border-input bg-white px-3 py-3 text-sm font-semibold text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                          />
                        </Field>
                        <Field label="Item image">
                          <MenuItemImagePicker
                            imageAltText={activeItemForm.imageAltText}
                            imageUrl={activeItemForm.imageUrl}
                            itemName={activeItemForm.name}
                            onChange={(next) =>
                              isEditingItem
                                ? setEditingItemForm({ ...editingItemForm, imageUrl: next.imageUrl, imageAltText: next.imageAltText })
                                : setItemForm({ ...itemForm, imageUrl: next.imageUrl, imageAltText: next.imageAltText })
                            }
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(12rem,0.7fr)] sm:items-end">
                          <Field label={activeItemHasVariants ? "Base price" : "Price"}>
                            <Input
                              className="h-11 bg-white font-semibold"
                              type="number"
                              min="0"
                              step="0.01"
                              value={activeItemHasVariants ? formatFormPrice(activeItemDerivedPrice ?? 0) : activeItemForm.price}
                              onChange={(event) =>
                                isEditingItem ? setEditingItemForm({ ...editingItemForm, price: event.target.value }) : setItemForm({ ...itemForm, price: event.target.value })
                              }
                              placeholder="0.00"
                              required={!activeItemHasVariants}
                              disabled={activeItemHasVariants}
                            />
                            {activeItemHasVariants ? (
                              <p className="text-xs font-semibold text-on-surface-variant">Auto set from the lowest variant price.</p>
                            ) : null}
                          </Field>
                          <Field label="Order">
                            <Input
                              className="h-11 bg-white font-semibold"
                              type="number"
                              min="1"
                              value={isEditingItem ? editingItemForm.displayOrder : itemForm.displayOrder}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, displayOrder: event.target.value })
                                  : setItemForm({ ...itemForm, displayOrder: event.target.value })
                              }
                              required
                            />
                          </Field>
                          <label className="flex h-11 items-center justify-between gap-4 rounded-lg border border-outline-variant/70 bg-surface-container-low px-4 text-sm font-bold text-on-surface">
                            <span>Available</span>
                            <input
                              type="checkbox"
                              checked={isEditingItem ? editingItemForm.isAvailable : itemForm.isAvailable}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, isAvailable: event.target.checked })
                                  : setItemForm({ ...itemForm, isAvailable: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-outline-variant text-primary"
                            />
                          </label>
                        </div>
                      </div>
                      <ItemVariantsEditor
                        form={isEditingItem ? editingItemForm : itemForm}
                        onChange={(nextForm) => (isEditingItem ? setEditingItemForm(nextForm) : setItemForm(nextForm))}
                      />
                    </div>
                    <div className="grid shrink-0 gap-2 border-t border-outline-variant/70 bg-surface-container-low px-4 py-4 sm:flex sm:flex-row-reverse sm:justify-start sm:px-6">
                      <Button type="submit" disabled={savingKey === "item" || (editingItem ? savingKey === `item-edit-${editingItem.menuItemId}` : false) || categories.length === 0} className="w-full sm:w-auto">
                        {savingKey === "item" || (editingItem ? savingKey === `item-edit-${editingItem.menuItemId}` : false) ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : isEditingItem ? (
                          <Save size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                        {isEditingItem ? "Update item" : "Add item"}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelEditItem} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
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

function ItemVariantsEditor({ form, onChange }: { form: ItemForm; onChange: (form: ItemForm) => void }) {
  function updateVariant(index: number, patch: Partial<ItemVariantForm>) {
    onChange({
      ...form,
      variants: form.variants.map((variant, currentIndex) => (currentIndex === index ? { ...variant, ...patch } : variant))
    });
  }

  function addVariant() {
    onChange({
      ...form,
      variants: [
        ...form.variants,
        {
          menuItemVariantId: null,
          name: "",
          price: "",
          displayOrder: String(form.variants.length + 1),
          isAvailable: true
        }
      ]
    });
  }

  function removeVariant(index: number) {
    onChange({
      ...form,
      variants: form.variants.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  return (
    <section className="grid w-full min-w-0 gap-4 rounded-xl border border-outline-variant/70 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-on-surface">Portions / sizes</p>
          <p className="mt-1 text-xs text-on-surface-variant">Use for Half, Full, Quarter, Regular, 300ml, Large, and similar options.</p>
        </div>
        <Button type="button" variant="outline" onClick={addVariant} className="h-11 w-full sm:w-auto">
          <Plus size={14} />
          Add Variant
        </Button>
      </div>

      {form.variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-3 text-sm font-semibold text-on-surface-variant">
          No variants. Customers will order this item at the single price above.
        </p>
      ) : (
        <div className="grid gap-3">
          {form.variants.map((variant, index) => (
            <div key={`${variant.menuItemVariantId ?? "new"}-${index}`} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-white p-3 lg:grid-cols-[1fr_8rem_6rem_auto]">
              <Field label="Variant">
                <Input value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} placeholder="Half, Full, 300ml" required />
              </Field>
              <Field label="Price">
                <Input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} required />
              </Field>
              <Field label="Order">
                <Input type="number" min="1" value={variant.displayOrder} onChange={(event) => updateVariant(index, { displayOrder: event.target.value })} required />
              </Field>
              <div className="grid gap-2 sm:flex sm:items-end">
                <label className="flex h-11 items-center gap-2 rounded-lg border border-outline-variant/60 px-3 text-sm font-semibold text-on-surface sm:border-0 sm:px-0">
                  <input
                    type="checkbox"
                    checked={variant.isAvailable}
                    onChange={(event) => updateVariant(index, { isAvailable: event.target.checked })}
                    className="h-4 w-4 rounded border-outline-variant text-primary"
                  />
                  Available
                </label>
                <Button type="button" variant="outline" onClick={() => removeVariant(index)} className="h-11 border-destructive/30 text-destructive">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MenuItemMobileCard({
  item,
  savingKey,
  onDeactivate,
  onEdit
}: {
  item: MenuItem;
  savingKey: string | null;
  onDeactivate: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
}) {
  return (
    <article className="rounded-xl border border-outline-variant/60 bg-white p-4">
      <div className="flex items-start gap-3">
        <MenuItemImage imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 break-words text-sm font-extrabold text-on-surface">{item.name}</p>
            <Badge variant={item.isAvailable ? "success" : "outline"}>{item.isAvailable ? "Available" : "Hidden"}</Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{item.categoryName}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">{item.description || "No description"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant/50 pt-3">
        <p className="text-base font-extrabold text-primary">{formatMoney(item.price)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onEdit(item)} className="h-11 border-outline-variant/60" aria-label={`Edit ${item.name}`}>
            <Pencil size={15} />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDeactivate(item)}
            disabled={savingKey === `item-${item.menuItemId}`}
            className="h-11 border-destructive/30 text-destructive"
            aria-label={`Turn off ${item.name}`}
          >
            {savingKey === `item-${item.menuItemId}` ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
            Off
          </Button>
        </div>
      </div>
    </article>
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

function validateCategoryForm(form: CategoryForm) {
  return firstInvalid(
    validateRequired(form.name, "Category name"),
    validatePositiveInteger(form.displayOrder, "Order")
  );
}

function validateItemForm(form: ItemForm) {
  return firstInvalid(
    validateRequired(form.menuCategoryId, "Category"),
    validateRequired(form.name, "Item name"),
    validateOptionalText(form.description, "Description", 500),
    form.variants.length > 0 ? validItemVariants(form.variants) : validateMoney(form.price, "Price"),
    validatePositiveInteger(form.displayOrder, "Order")
  );
}

function validItemVariants(variants: ItemVariantForm[]) {
  if (variants.length === 0) {
    return { isValid: true, message: null };
  }

  for (const [index, variant] of variants.entries()) {
    const validation = firstInvalid(
      validateRequired(variant.name, `Variant ${index + 1} name`),
      validateMoney(variant.price, `Variant ${index + 1} price`),
      validatePositiveInteger(variant.displayOrder, `Variant ${index + 1} order`)
    );

    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true, message: null };
}

function getItemFormPrice(form: ItemForm): number {
  const variantPrices = form.variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  if (variantPrices.length > 0) {
    return Math.min(...variantPrices);
  }

  const price = Number(form.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function formatFormPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}

function toVariantInput(variants: ItemVariantForm[]) {
  return variants
    .filter((variant) => variant.name.trim().length > 0)
    .map((variant) => ({
      menuItemVariantId: variant.menuItemVariantId,
      name: variant.name.trim(),
      price: Number(variant.price),
      isAvailable: variant.isAvailable,
      displayOrder: toPositiveNumber(variant.displayOrder)
    }));
}
