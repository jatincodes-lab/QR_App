"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  CircleAlert,
  Copy,
  Loader2,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Save,
  Settings,
  Store,
  Trash2,
  Utensils,
  ClipboardList
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "../../../../components/admin-shell";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import {
  ApiError,
  AdminOrder,
  BranchListItem,
  BranchOrderSettings,
  BranchTable,
  MenuCategory,
  MenuItem,
  createBranchOrderSettings,
  createBranchTable,
  createMenuCategory,
  createMenuItem,
  deactivateBranchTable,
  deactivateMenuCategory,
  deactivateMenuItem,
  getBranch,
  getBranchOrderSettings,
  getBranchTables,
  getAdminOrders,
  getMenuCategories,
  getMenuItems,
  regenerateBranchTableQrToken,
  updateAdminOrderStatus,
  updateBranchOrderSettings,
  type OrderStatusCode
} from "../../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../../lib/auth";

type CategoryForm = {
  name: string;
  displayOrder: string;
};

type ItemForm = {
  menuCategoryId: string;
  name: string;
  description: string;
  price: string;
  displayOrder: string;
  isAvailable: boolean;
};

type TableForm = {
  name: string;
  displayOrder: string;
};

type SettingsForm = {
  enableDirectQrOrdering: boolean;
  requireCustomerName: boolean;
  requireCustomerWhatsApp: boolean;
  waiterCallEnabled: boolean;
};

const EmptyCategoryForm: CategoryForm = { name: "", displayOrder: "1" };
const EmptyItemForm: ItemForm = {
  menuCategoryId: "",
  name: "",
  description: "",
  price: "",
  displayOrder: "1",
  isAvailable: true
};
const EmptyTableForm: TableForm = { name: "", displayOrder: "1" };
const DefaultSettingsForm: SettingsForm = {
  enableDirectQrOrdering: false,
  requireCustomerName: true,
  requireCustomerWhatsApp: true,
  waiterCallEnabled: true
};
const OrderPollIntervalMs = 10_000;

export default function AdminBranchDetailPage() {
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;

  const [branch, setBranch] = useState<BranchListItem | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<BranchTable[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [settings, setSettings] = useState<BranchOrderSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DefaultSettingsForm);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [itemForm, setItemForm] = useState<ItemForm>(EmptyItemForm);
  const [tableForm, setTableForm] = useState<TableForm>(EmptyTableForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [lastOrdersRefreshAt, setLastOrdersRefreshAt] = useState<Date | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => [...categories].filter((category) => category.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [categories]
  );
  const activeItems = useMemo(
    () => [...items].filter((item) => item.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [items]
  );
  const activeTables = useMemo(
    () => [...tables].filter((table) => table.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [tables]
  );
  const openOrders = useMemo(
    () => orders.filter((order) => !["Completed", "Cancelled"].includes(order.orderStatusCode)),
    [orders]
  );

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadBranchDetail();
  }, [branchId, router]);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void loadBranchOrders({ silent: true });
    }, OrderPollIntervalMs);

    return () => window.clearInterval(timer);
  }, [branchId]);

  useEffect(() => {
    if (!itemForm.menuCategoryId && activeCategories.length > 0) {
      setItemForm((current) => ({ ...current, menuCategoryId: activeCategories[0].menuCategoryId }));
    }
  }, [activeCategories, itemForm.menuCategoryId]);

  async function loadBranchDetail() {
    setIsLoading(true);
    setError(null);

    try {
      const [branchResponse, categoryResponse, itemResponse, tableResponse, settingsResponse, orderResponse] = await Promise.all([
        getBranch(branchId),
        getMenuCategories(branchId),
        getMenuItems(branchId),
        getBranchTables(branchId),
        getBranchOrderSettings(branchId),
        getAdminOrders(branchId)
      ]);

      setBranch(branchResponse);
      setCategories(categoryResponse);
      setItems(itemResponse);
      setTables(tableResponse);
      setOrders(orderResponse);
      setSettings(settingsResponse);
      setSettingsForm(toSettingsForm(settingsResponse));
      setLastOrdersRefreshAt(new Date());
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadBranchOrders(options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setIsRefreshingOrders(true);
      setError(null);
    }

    try {
      const orderResponse = await getAdminOrders(branchId);
      setOrders(orderResponse);
      setLastOrdersRefreshAt(new Date());
    } catch (caught) {
      if (!options.silent) {
        handleApiError(caught);
      } else if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/admin/login");
      }
    } finally {
      if (!options.silent) {
        setIsRefreshingOrders(false);
      }
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSaving("category", async () => {
      const category = await createMenuCategory(branchId, {
        name: categoryForm.name.trim(),
        displayOrder: toPositiveNumber(categoryForm.displayOrder)
      });
      setCategories((current) => [...current, category]);
      setCategoryForm({ name: "", displayOrder: String(activeCategories.length + 2) });
      setNotice("Menu category added.");
    });
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSaving("item", async () => {
      const item = await createMenuItem(branchId, {
        menuCategoryId: itemForm.menuCategoryId,
        name: itemForm.name.trim(),
        description: optional(itemForm.description),
        price: Number(itemForm.price),
        isAvailable: itemForm.isAvailable,
        displayOrder: toPositiveNumber(itemForm.displayOrder)
      });
      setItems((current) => [...current, item]);
      setItemForm((current) => ({
        ...EmptyItemForm,
        menuCategoryId: current.menuCategoryId,
        displayOrder: String(activeItems.length + 2)
      }));
      setNotice("Menu item added.");
    });
  }

  async function handleCreateTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSaving("table", async () => {
      const table = await createBranchTable(branchId, {
        name: tableForm.name.trim(),
        displayOrder: toPositiveNumber(tableForm.displayOrder)
      });
      setTables((current) => [...current, table]);
      setTableForm({ name: "", displayOrder: String(activeTables.length + 2) });
      setNotice("Table and QR token added.");
    });
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSaving("settings", async () => {
      const saved = settings
        ? await updateBranchOrderSettings(branchId, settingsForm)
        : await createBranchOrderSettings(branchId, settingsForm);

      setSettings(saved);
      setSettingsForm(toSettingsForm(saved));
      setNotice("Order settings saved.");
    });
  }

  async function handleDeactivateCategory(category: MenuCategory) {
    await runSaving(`category-${category.menuCategoryId}`, async () => {
      await deactivateMenuCategory(branchId, category.menuCategoryId);
      setCategories((current) => current.filter((item) => item.menuCategoryId !== category.menuCategoryId));
      setNotice("Menu category turned off.");
    });
  }

  async function handleDeactivateItem(item: MenuItem) {
    await runSaving(`item-${item.menuItemId}`, async () => {
      await deactivateMenuItem(branchId, item.menuItemId);
      setItems((current) => current.filter((currentItem) => currentItem.menuItemId !== item.menuItemId));
      setNotice("Menu item turned off.");
    });
  }

  async function handleDeactivateTable(table: BranchTable) {
    await runSaving(`table-${table.tableId}`, async () => {
      await deactivateBranchTable(branchId, table.tableId);
      setTables((current) => current.filter((currentTable) => currentTable.tableId !== table.tableId));
      setNotice("Table turned off.");
    });
  }

  async function handleRegenerateQr(table: BranchTable) {
    await runSaving(`qr-${table.tableId}`, async () => {
      const updated = await regenerateBranchTableQrToken(branchId, table.tableId);
      setTables((current) => current.map((currentTable) => (currentTable.tableId === updated.tableId ? updated : currentTable)));
      setNotice("QR token regenerated.");
    });
  }

  async function handleUpdateOrderStatus(order: AdminOrder, status: OrderStatusCode) {
    await runSaving(`order-${order.orderId}-${status}`, async () => {
      const updated = await updateAdminOrderStatus(branchId, order.orderId, status);
      setOrders((current) => current.map((currentOrder) => (currentOrder.orderId === updated.orderId ? updated : currentOrder)));
      setNotice(`Order #${shortId(updated.orderId)} moved to ${updated.orderStatusCode}.`);
    });
  }

  async function handleCopyQrLink(table: BranchTable) {
    const url = `${window.location.origin}/qr/${table.qrToken}`;
    await window.navigator.clipboard.writeText(url);
    setNotice("QR menu link copied.");
  }

  async function runSaving(key: string, action: () => Promise<void>) {
    setSavingKey(key);
    setError(null);
    setNotice(null);

    try {
      await action();
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSavingKey(null);
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
    <AdminShell active="branches" onLogout={handleLogout} branchName={branch?.name ?? "Branch setup"}>
      <div className="mx-auto max-w-7xl space-y-gutter">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/branches")} className="-ml-3 mb-3 text-on-surface-variant">
              <ArrowLeft size={17} />
              Branches
            </Button>
            <Badge variant="secondary" className="gap-2 bg-primary/5 text-primary">
              <Store size={14} />
              Branch workspace
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">{branch?.name ?? "Branch setup"}</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Configure the menu, table QR codes, and customer ordering behavior for this location.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => void loadBranchDetail()} className="border-outline-variant/60 bg-white">
            <RefreshCw size={17} />
            Refresh
          </Button>
        </header>

        {error ? <Message variant="destructive">{error}</Message> : null}
        {notice ? <Message variant="success">{notice}</Message> : null}

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<ChefHat size={20} />} label="Categories" value={activeCategories.length.toString()} />
              <Metric icon={<Utensils size={20} />} label="Menu items" value={activeItems.length.toString()} />
              <Metric icon={<QrCode size={20} />} label="Tables" value={activeTables.length.toString()} />
              <Metric icon={<ClipboardList size={20} />} label="Open orders" value={openOrders.length.toString()} />
            </section>

            <section className="grid gap-gutter xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
              <MenuPanel
                categories={activeCategories}
                items={activeItems}
                categoryForm={categoryForm}
                itemForm={itemForm}
                savingKey={savingKey}
                onCategoryFormChange={setCategoryForm}
                onItemFormChange={setItemForm}
                onCreateCategory={handleCreateCategory}
                onCreateItem={handleCreateItem}
                onDeactivateCategory={handleDeactivateCategory}
                onDeactivateItem={handleDeactivateItem}
              />

              <div className="space-y-gutter">
                <OrdersPanel
                  isRefreshing={isRefreshingOrders}
                  lastRefreshedAt={lastOrdersRefreshAt}
                  orders={orders}
                  savingKey={savingKey}
                  onRefresh={() => void loadBranchOrders()}
                  onUpdateStatus={handleUpdateOrderStatus}
                />
                <SettingsPanel
                  form={settingsForm}
                  isSaving={savingKey === "settings"}
                  onChange={setSettingsForm}
                  onSubmit={handleSaveSettings}
                />
                <TablesPanel
                  tables={activeTables}
                  form={tableForm}
                  savingKey={savingKey}
                  onFormChange={setTableForm}
                  onCreateTable={handleCreateTable}
                  onCopyQrLink={handleCopyQrLink}
                  onDeactivateTable={handleDeactivateTable}
                  onRegenerateQr={handleRegenerateQr}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function MenuPanel({
  categories,
  items,
  categoryForm,
  itemForm,
  savingKey,
  onCategoryFormChange,
  onItemFormChange,
  onCreateCategory,
  onCreateItem,
  onDeactivateCategory,
  onDeactivateItem
}: {
  categories: MenuCategory[];
  items: MenuItem[];
  categoryForm: CategoryForm;
  itemForm: ItemForm;
  savingKey: string | null;
  onCategoryFormChange: (form: CategoryForm) => void;
  onItemFormChange: (form: ItemForm) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateItem: (event: FormEvent<HTMLFormElement>) => void;
  onDeactivateCategory: (category: MenuCategory) => void;
  onDeactivateItem: (item: MenuItem) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <CardTitle className="text-headline-md text-primary">Menu setup</CardTitle>
        <CardDescription>Create customer-facing categories and items for this branch.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onCreateCategory} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 sm:grid-cols-[1fr_7rem_auto]">
          <Field label="Category name">
            <Input value={categoryForm.name} onChange={(event) => onCategoryFormChange({ ...categoryForm, name: event.target.value })} required />
          </Field>
          <Field label="Order">
            <Input
              type="number"
              min="1"
              value={categoryForm.displayOrder}
              onChange={(event) => onCategoryFormChange({ ...categoryForm, displayOrder: event.target.value })}
              required
            />
          </Field>
          <Button type="submit" disabled={savingKey === "category"} className="self-end">
            {savingKey === "category" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            Add
          </Button>
        </form>

        <form onSubmit={onCreateItem} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 lg:grid-cols-2">
          <Field label="Category">
            <select
              value={itemForm.menuCategoryId}
              onChange={(event) => onItemFormChange({ ...itemForm, menuCategoryId: event.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              disabled={categories.length === 0}
            >
              {categories.length === 0 ? <option value="">Add a category first</option> : null}
              {categories.map((category) => (
                <option key={category.menuCategoryId} value={category.menuCategoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Item name">
            <Input value={itemForm.name} onChange={(event) => onItemFormChange({ ...itemForm, name: event.target.value })} required />
          </Field>
          <Field label="Description">
            <Input value={itemForm.description} onChange={(event) => onItemFormChange({ ...itemForm, description: event.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <Field label="Price">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={itemForm.price}
                onChange={(event) => onItemFormChange({ ...itemForm, price: event.target.value })}
                required
              />
            </Field>
            <Field label="Order">
              <Input
                type="number"
                min="1"
                value={itemForm.displayOrder}
                onChange={(event) => onItemFormChange({ ...itemForm, displayOrder: event.target.value })}
                required
              />
            </Field>
          </div>
          <label className="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface">
            <input
              type="checkbox"
              checked={itemForm.isAvailable}
              onChange={(event) => onItemFormChange({ ...itemForm, isAvailable: event.target.checked })}
              className="h-4 w-4 rounded border-outline-variant text-primary"
            />
            Available
          </label>
          <Button type="submit" disabled={savingKey === "item" || categories.length === 0} className="justify-self-start">
            {savingKey === "item" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            Add Item
          </Button>
        </form>

        <div className="overflow-hidden rounded-lg border border-outline-variant/30">
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
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-on-surface-variant">
                    Add categories and menu items to start building this branch menu.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.menuItemId}>
                    <TableCell>
                      <p className="font-semibold text-on-surface">{item.name}</p>
                      <p className="mt-1 max-w-sm truncate text-xs text-on-surface-variant">{item.description || "No description"}</p>
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>{formatMoney(item.price)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable ? "success" : "secondary"}>{item.isAvailable ? "Available" : "Hidden"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onDeactivateItem(item)}
                          disabled={savingKey === `item-${item.menuItemId}`}
                          className="h-9 w-9 border-destructive/30 text-destructive"
                          aria-label={`Turn off ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category.menuCategoryId} variant="secondary" className="gap-2">
                {category.name}
                <button
                  type="button"
                  onClick={() => onDeactivateCategory(category)}
                  disabled={savingKey === `category-${category.menuCategoryId}`}
                  className="text-on-surface-variant hover:text-destructive"
                  aria-label={`Turn off ${category.name}`}
                >
                  <Power size={13} />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SettingsPanel({
  form,
  isSaving,
  onChange,
  onSubmit
}: {
  form: SettingsForm;
  isSaving: boolean;
  onChange: (form: SettingsForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <CardTitle className="text-headline-md text-primary">Order settings</CardTitle>
        <CardDescription>Control customer ordering rules for QR menus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Toggle label="Direct QR ordering" checked={form.enableDirectQrOrdering} onChange={(value) => onChange({ ...form, enableDirectQrOrdering: value })} />
          <Toggle label="Require customer name" checked={form.requireCustomerName} onChange={(value) => onChange({ ...form, requireCustomerName: value })} />
          <Toggle label="Require WhatsApp number" checked={form.requireCustomerWhatsApp} onChange={(value) => onChange({ ...form, requireCustomerWhatsApp: value })} />
          <Toggle label="Waiter call enabled" checked={form.waiterCallEnabled} onChange={(value) => onChange({ ...form, waiterCallEnabled: value })} />
          <Button type="submit" disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const OrderStatuses: OrderStatusCode[] = ["Accepted", "Preparing", "Ready", "Completed", "Cancelled"];

function OrdersPanel({
  isRefreshing,
  lastRefreshedAt,
  orders,
  savingKey,
  onRefresh,
  onUpdateStatus
}: {
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  orders: AdminOrder[];
  savingKey: string | null;
  onRefresh: () => void;
  onUpdateStatus: (order: AdminOrder, status: OrderStatusCode) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-headline-md text-primary">Kitchen orders</CardTitle>
            <CardDescription>
              Auto-refreshes every 10 seconds{lastRefreshedAt ? ` · updated ${formatClockTime(lastRefreshedAt)}` : ""}.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">
            No QR orders yet.
          </div>
        ) : (
          orders.map((order) => (
            <article key={order.orderId} className="rounded-lg border border-outline-variant/30 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-on-surface">#{shortId(order.orderId)}</p>
                    <Badge
                      variant={order.orderStatusCode === "Completed" ? "secondary" : order.orderStatusCode === "Cancelled" ? "outline" : "success"}
                      className={order.orderStatusCode === "Cancelled" ? "border-destructive/30 text-destructive" : undefined}
                    >
                      {order.orderStatusCode}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {order.tableName} · {formatDateTime(order.createdAtUtc)}
                  </p>
                  {order.customerName || order.customerWhatsApp ? (
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {[order.customerName, order.customerWhatsApp].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <p className="text-lg font-extrabold text-primary">{formatMoney(order.totalAmount)}</p>
              </div>

              <div className="mt-3 divide-y divide-outline-variant/30 border-t border-outline-variant/30">
                {order.items.map((item) => (
                  <div key={item.orderItemId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words font-semibold text-on-surface">{item.menuItemName}</span>
                    <span className="shrink-0 text-on-surface-variant">
                      {item.quantity} x {formatMoney(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes ? <p className="mt-3 rounded bg-surface-container-low p-2 text-sm text-on-surface-variant">{order.notes}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {OrderStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={order.orderStatusCode === status ? "default" : "outline"}
                    size="sm"
                    disabled={savingKey === `order-${order.orderId}-${status}` || order.orderStatusCode === status}
                    onClick={() => onUpdateStatus(order, status)}
                  >
                    {savingKey === `order-${order.orderId}-${status}` ? <Loader2 size={14} className="animate-spin" /> : null}
                    {status}
                  </Button>
                ))}
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TablesPanel({
  tables,
  form,
  savingKey,
  onFormChange,
  onCreateTable,
  onCopyQrLink,
  onDeactivateTable,
  onRegenerateQr
}: {
  tables: BranchTable[];
  form: TableForm;
  savingKey: string | null;
  onFormChange: (form: TableForm) => void;
  onCreateTable: (event: FormEvent<HTMLFormElement>) => void;
  onCopyQrLink: (table: BranchTable) => void;
  onDeactivateTable: (table: BranchTable) => void;
  onRegenerateQr: (table: BranchTable) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <CardTitle className="text-headline-md text-primary">Tables and QR</CardTitle>
        <CardDescription>Create table QR codes and copy customer menu links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={onCreateTable} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 sm:grid-cols-[1fr_7rem_auto]">
          <Field label="Table name">
            <Input value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Order">
            <Input type="number" min="1" value={form.displayOrder} onChange={(event) => onFormChange({ ...form, displayOrder: event.target.value })} required />
          </Field>
          <Button type="submit" disabled={savingKey === "table"} className="self-end">
            {savingKey === "table" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            Add
          </Button>
        </form>

        <div className="space-y-3">
          {tables.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant/50 px-4 py-10 text-center text-sm text-on-surface-variant">
              Add tables to generate QR menu links for this branch.
            </div>
          ) : (
            tables.map((table) => (
              <div key={table.tableId} className="rounded-lg border border-outline-variant/30 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">{table.name}</p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">{table.qrToken}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/5 text-primary">
                    <QrCode size={18} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onCopyQrLink(table)}>
                    <Copy size={15} />
                    Copy Link
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onRegenerateQr(table)} disabled={savingKey === `qr-${table.tableId}`}>
                    <RefreshCw size={15} />
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDeactivateTable(table)}
                    disabled={savingKey === `table-${table.tableId}`}
                    className="border-destructive/30 text-destructive"
                  >
                    <Trash2 size={15} />
                    Turn Off
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="rounded-xl border border-outline-variant/40 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="flex min-h-[72px] items-center gap-4 px-5 py-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center text-primary">{icon}</div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
            <p className="mt-0.5 truncate text-[22px] font-semibold leading-none text-on-surface">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-outline-variant text-primary" />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Message({ children, variant }: { children: ReactNode; variant: "destructive" | "success" }) {
  return (
    <Alert variant={variant} className="flex items-start gap-2">
      <CircleAlert size={18} className="mt-0.5 shrink-0" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item} className="border-outline-variant/30 bg-surface-container-lowest">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function toSettingsForm(settings: BranchOrderSettings | null): SettingsForm {
  if (!settings) {
    return DefaultSettingsForm;
  }

  return {
    enableDirectQrOrdering: settings.enableDirectQrOrdering,
    requireCustomerName: settings.requireCustomerName,
    requireCustomerWhatsApp: settings.requireCustomerWhatsApp,
    waiterCallEnabled: settings.waiterCallEnabled
  };
}

function toPositiveNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}

function shortId(value: string): string {
  return value.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatClockTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}
