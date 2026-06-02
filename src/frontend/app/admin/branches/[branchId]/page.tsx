"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Copy,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Power,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Settings,
  Store,
  Pencil,
  Trash2,
  Utensils,
  ClipboardList,
  Clock3,
  Flame,
  PackageCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
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
  WaiterCall,
  createBranchOrderSettings,
  createBranchTable,
  createMenuCategory,
  createMenuItem,
  deactivateBranchTable,
  deactivateMenuCategory,
  deactivateMenuItem,
  getWaiterCalls,
  getBranch,
  getBranchOrderSettings,
  getBranchTables,
  getAdminOrders,
  getMenuCategories,
  getMenuItems,
  regenerateBranchTableQrToken,
  updateBranch,
  updateAdminOrderStatus,
  updateMenuCategory,
  updateMenuItem,
  updateWaiterCallStatus,
  updateBranchOrderSettings,
  type OrderStatusCode,
  type WaiterCallStatusCode
} from "../../../../lib/api";
import { clearAccessToken, getAccessToken } from "../../../../lib/auth";
import { AdminOrderRealtimeEvent, AdminWaiterCallRealtimeEvent, createAdminOrderConnection, stopConnection } from "../../../../lib/realtime";

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

type BranchProfileForm = {
  name: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

type FeedbackState = {
  type: "loading" | "success" | "error";
  message: string;
};

type WorkspaceTab = "kitchen" | "menu" | "tables" | "settings";

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
const EmptyBranchProfileForm: BranchProfileForm = {
  name: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "IN"
};
const DefaultSettingsForm: SettingsForm = {
  enableDirectQrOrdering: false,
  requireCustomerName: true,
  requireCustomerWhatsApp: true,
  waiterCallEnabled: true
};
const OrderPollIntervalMs = 10_000;
const WorkspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: "kitchen", label: "Kitchen", icon: ClipboardList },
  { id: "menu", label: "Menu", icon: Utensils },
  { id: "tables", label: "Tables", icon: QrCode },
  { id: "settings", label: "Settings", icon: Settings }
];
const WorkspaceTabIds = new Set<WorkspaceTab>(WorkspaceTabs.map((tab) => tab.id));

export default function AdminBranchDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;

  const [branch, setBranch] = useState<BranchListItem | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<BranchTable[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [settings, setSettings] = useState<BranchOrderSettings | null>(null);
  const [branchProfileForm, setBranchProfileForm] = useState<BranchProfileForm>(EmptyBranchProfileForm);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DefaultSettingsForm);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [itemForm, setItemForm] = useState<ItemForm>(EmptyItemForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryForm, setEditingCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<ItemForm>(EmptyItemForm);
  const [tableForm, setTableForm] = useState<TableForm>(EmptyTableForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastOrdersRefreshAt, setLastOrdersRefreshAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("kitchen");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<Set<string>>(new Set());
  const [highlightedWaiterCallIds, setHighlightedWaiterCallIds] = useState<Set<string>>(new Set());
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const knownWaiterCallIdsRef = useRef<Set<string>>(new Set());
  const soundAlertsEnabledRef = useRef(false);

  useEffect(() => {
    if (!feedback || feedback.type === "loading") {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
  const openWaiterCalls = useMemo(
    () => waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)),
    [waiterCalls]
  );

  useEffect(() => {
    soundAlertsEnabledRef.current = soundAlertsEnabled;
  }, [soundAlertsEnabled]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadBranchDetail();
  }, [branchId, router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (isWorkspaceTab(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    if (!getAccessToken()) {
      return;
    }

    let isActive = true;
    let refreshQueued = false;
    const connection = createAdminOrderConnection();

    const refreshOrders = () => {
      if (!isActive || refreshQueued || document.hidden) {
        return;
      }

      refreshQueued = true;
      window.setTimeout(() => {
        refreshQueued = false;
        void loadKitchenActivity({ silent: true });
      }, 250);
    };

    const handleOrderEvent = (event: AdminOrderRealtimeEvent) => {
      if (event.branchId.toLowerCase() === branchId.toLowerCase()) {
        refreshOrders();
      }
    };
    const handleWaiterCallEvent = (event: AdminWaiterCallRealtimeEvent) => {
      if (event.branchId.toLowerCase() === branchId.toLowerCase()) {
        refreshOrders();
      }
    };

    connection.on("OrderCreated", handleOrderEvent);
    connection.on("OrderStatusUpdated", handleOrderEvent);
    connection.on("WaiterCallCreated", handleWaiterCallEvent);
    connection.on("WaiterCallStatusUpdated", handleWaiterCallEvent);
    connection.onreconnected(() => {
      setIsRealtimeConnected(true);
      void connection.invoke("JoinBranch", branchId).catch(() => setIsRealtimeConnected(false));
    });
    connection.onreconnecting(() => setIsRealtimeConnected(false));
    connection.onclose(() => setIsRealtimeConnected(false));

    void connection
      .start()
      .then(async () => {
        if (!isActive) {
          return;
        }

        await connection.invoke("JoinBranch", branchId);
        setIsRealtimeConnected(true);
      })
      .catch(() => setIsRealtimeConnected(false));

    return () => {
      isActive = false;
      setIsRealtimeConnected(false);
      void connection
        .invoke("LeaveBranch", branchId)
        .catch(() => undefined)
        .finally(() => {
          void stopConnection(connection);
        });
    };
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
      const [branchResponse, categoryResponse, itemResponse, tableResponse, settingsResponse, orderResponse, waiterCallResponse] = await Promise.all([
        getBranch(branchId),
        getMenuCategories(branchId),
        getMenuItems(branchId),
        getBranchTables(branchId),
        getBranchOrderSettings(branchId),
        getAdminOrders(branchId),
        getWaiterCalls(branchId)
      ]);

      setBranch(branchResponse);
      setBranchProfileForm(toBranchProfileForm(branchResponse));
      setCategories(categoryResponse);
      setItems(itemResponse);
      setTables(tableResponse);
      setOrders(orderResponse);
      knownOrderIdsRef.current = new Set(orderResponse.map((order) => order.orderId));
      setWaiterCalls(waiterCallResponse);
      knownWaiterCallIdsRef.current = new Set(waiterCallResponse.map((call) => call.waiterCallId));
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
    await loadKitchenActivity(options);
  }

  async function loadKitchenActivity(options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setIsRefreshingOrders(true);
      setError(null);
    }

    try {
      const [orderResponse, waiterCallResponse] = await Promise.all([
        getAdminOrders(branchId),
        getWaiterCalls(branchId)
      ]);
      const newOrderIds = orderResponse
        .filter((order) => !knownOrderIdsRef.current.has(order.orderId) && order.orderStatusCode === "Placed")
        .map((order) => order.orderId);
      const newWaiterCallIds = waiterCallResponse
        .filter((call) => !knownWaiterCallIdsRef.current.has(call.waiterCallId) && call.statusCode === "Open")
        .map((call) => call.waiterCallId);
      knownOrderIdsRef.current = new Set(orderResponse.map((order) => order.orderId));
      knownWaiterCallIdsRef.current = new Set(waiterCallResponse.map((call) => call.waiterCallId));

      if (newOrderIds.length > 0) {
        setHighlightedOrderIds((current) => new Set([...current, ...newOrderIds]));
        window.setTimeout(() => {
          setHighlightedOrderIds((current) => {
            const next = new Set(current);
            newOrderIds.forEach((orderId) => next.delete(orderId));
            return next;
          });
        }, 20_000);

        if (soundAlertsEnabledRef.current) {
          playKitchenAlert();
        }

        setFeedback({ type: "success", message: `${newOrderIds.length} new kitchen order${newOrderIds.length === 1 ? "" : "s"} received.` });
      }

      if (newWaiterCallIds.length > 0) {
        setHighlightedWaiterCallIds((current) => new Set([...current, ...newWaiterCallIds]));
        window.setTimeout(() => {
          setHighlightedWaiterCallIds((current) => {
            const next = new Set(current);
            newWaiterCallIds.forEach((waiterCallId) => next.delete(waiterCallId));
            return next;
          });
        }, 20_000);

        if (soundAlertsEnabledRef.current) {
          playKitchenAlert();
        }

        setFeedback({ type: "success", message: `${newWaiterCallIds.length} new waiter call${newWaiterCallIds.length === 1 ? "" : "s"} received.` });
      }

      setOrders(orderResponse);
      setWaiterCalls(waiterCallResponse);
      setLastOrdersRefreshAt(new Date());
    } catch (caught) {
      if (!options.silent) {
        handleApiError(caught);
      } else if (caught instanceof ApiError && caught.status === 401) {
        router.replace("/admin/login?reason=session-expired");
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
      showSuccess("Menu category added.");
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
      showSuccess("Menu item added.");
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
      showSuccess("Table and QR token added.");
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
      showSuccess("Order settings saved.");
    });
  }

  async function handleDeactivateCategory(category: MenuCategory) {
    await runSaving(`category-${category.menuCategoryId}`, async () => {
      await deactivateMenuCategory(branchId, category.menuCategoryId);
      setCategories((current) => current.filter((item) => item.menuCategoryId !== category.menuCategoryId));
      showSuccess("Menu category turned off.");
    });
  }

  async function handleDeactivateItem(item: MenuItem) {
    await runSaving(`item-${item.menuItemId}`, async () => {
      await deactivateMenuItem(branchId, item.menuItemId);
      setItems((current) => current.filter((currentItem) => currentItem.menuItemId !== item.menuItemId));
      showSuccess("Menu item turned off.");
    });
  }

  async function handleDeactivateTable(table: BranchTable) {
    await runSaving(`table-${table.tableId}`, async () => {
      await deactivateBranchTable(branchId, table.tableId);
      setTables((current) => current.filter((currentTable) => currentTable.tableId !== table.tableId));
      showSuccess("Table turned off.");
    });
  }

  async function handleRegenerateQr(table: BranchTable) {
    await runSaving(`qr-${table.tableId}`, async () => {
      const updated = await regenerateBranchTableQrToken(branchId, table.tableId);
      setTables((current) => current.map((currentTable) => (currentTable.tableId === updated.tableId ? updated : currentTable)));
      showSuccess("QR token regenerated.");
    });
  }

  async function handleUpdateOrderStatus(order: AdminOrder, status: OrderStatusCode) {
    await runSaving(`order-${order.orderId}-${status}`, async () => {
      const updated = await updateAdminOrderStatus(branchId, order.orderId, status);
      setOrders((current) => current.map((currentOrder) => (currentOrder.orderId === updated.orderId ? updated : currentOrder)));
      showSuccess(`Order #${shortId(updated.orderId)} moved to ${updated.orderStatusCode}.`);
    });
  }

  async function handleSaveBranchProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!branch) {
      return;
    }

    await runSaving("branch-profile", async () => {
      const updated = await updateBranch(branchId, {
        name: branchProfileForm.name.trim(),
        phoneNumber: optional(branchProfileForm.phoneNumber),
        addressLine1: optional(branchProfileForm.addressLine1),
        addressLine2: optional(branchProfileForm.addressLine2),
        city: optional(branchProfileForm.city),
        state: optional(branchProfileForm.state),
        postalCode: optional(branchProfileForm.postalCode),
        countryCode: branchProfileForm.countryCode.trim().toUpperCase(),
        isActive: branch.isActive
      });

      setBranch(updated);
      setBranchProfileForm(toBranchProfileForm(updated));
      showSuccess("Branch profile updated.");
    });
  }

  async function handleUpdateWaiterCallStatus(waiterCall: WaiterCall, status: WaiterCallStatusCode) {
    await runSaving(`waiter-call-${waiterCall.waiterCallId}-${status}`, async () => {
      const updated = await updateWaiterCallStatus(branchId, waiterCall.waiterCallId, status);
      setWaiterCalls((current) => current.map((call) => (call.waiterCallId === updated.waiterCallId ? updated : call)));
      showSuccess(`Waiter call for ${updated.tableName} moved to ${updated.statusCode}.`);
    });
  }

  function handleStartEditCategory(category: MenuCategory) {
    setEditingCategoryId(category.menuCategoryId);
    setEditingCategoryForm({
      name: category.name,
      displayOrder: String(category.displayOrder)
    });
  }

  async function handleSaveCategory(category: MenuCategory) {
    await runSaving(`category-edit-${category.menuCategoryId}`, async () => {
      const updated = await updateMenuCategory(branchId, category.menuCategoryId, {
        name: editingCategoryForm.name.trim(),
        displayOrder: toPositiveNumber(editingCategoryForm.displayOrder),
        isActive: category.isActive
      });
      setCategories((current) => current.map((item) => (item.menuCategoryId === updated.menuCategoryId ? updated : item)));
      setEditingCategoryId(null);
      setEditingCategoryForm(EmptyCategoryForm);
      showSuccess("Menu category updated.");
    });
  }

  function handleStartEditItem(item: MenuItem) {
    setEditingItemId(item.menuItemId);
    setEditingItemForm({
      menuCategoryId: item.menuCategoryId,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      displayOrder: String(item.displayOrder),
      isAvailable: item.isAvailable
    });
  }

  async function handleSaveItem(item: MenuItem) {
    await runSaving(`item-edit-${item.menuItemId}`, async () => {
      const updated = await updateMenuItem(branchId, item.menuItemId, {
        menuCategoryId: editingItemForm.menuCategoryId,
        name: editingItemForm.name.trim(),
        description: optional(editingItemForm.description),
        price: Number(editingItemForm.price),
        isAvailable: editingItemForm.isAvailable,
        isActive: item.isActive,
        displayOrder: toPositiveNumber(editingItemForm.displayOrder)
      });
      setItems((current) => current.map((currentItem) => (currentItem.menuItemId === updated.menuItemId ? updated : currentItem)));
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
      showSuccess("Menu item updated.");
    });
  }

  async function handleCopyQrLink(table: BranchTable) {
    const url = getQrMenuUrl(table);
    await window.navigator.clipboard.writeText(url);
    showSuccess("QR menu link copied.");
  }

  async function handleDownloadQr(table: BranchTable) {
    try {
      const url = getQrMenuUrl(table);
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 720
      });
      const branchName = branch?.name ?? "Qrave";
      const contactLine = getQrContactLine(branch);
      const dataUrl = await buildQrPlacardDataUrl(branchName, contactLine, table.name, url, qrDataUrl);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${safeFileName(branchName)}-${safeFileName(table.name)}-table-qr.png`;
      link.click();
      showSuccess("Table QR placard downloaded.");
    } catch {
      showError("Could not generate the QR placard. Please try again.");
    }
  }

  async function handlePrintQr(table: BranchTable) {
    try {
      const url = getQrMenuUrl(table);
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 768
      });
      const printWindow = window.open("", "_blank", "width=520,height=720");

      if (!printWindow) {
        showError("Popup blocked. Please allow popups for this site and try printing again.");
        return;
      }

      const branchName = branch?.name ?? "Qrave";
      const contactLine = getQrContactLine(branch);
      const title = `${branchName} - ${table.name}`;
      printWindow.document.write(buildQrPrintHtml(title, branchName, contactLine, table.name, url, dataUrl));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      showSuccess("QR print view opened.");
    } catch {
      showError("Could not prepare the QR print view. Please try again.");
    }
  }

  async function runSaving(key: string, action: () => Promise<void>) {
    setSavingKey(key);
    setError(null);
    setNotice(null);
    setFeedback({ type: "loading", message: getSavingMessage(key) });

    try {
      await action();
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  function showSuccess(message: string) {
    setError(null);
    setNotice(message);
    setFeedback({ type: "success", message });
  }

  function showError(message: string) {
    setNotice(null);
    setError(message);
    setFeedback({ type: "error", message });
  }

  function handleLogout() {
    clearAccessToken();
    router.replace("/admin/login?reason=logged-out");
  }

  function handleApiError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      router.replace("/admin/login?reason=session-expired");
      return;
    }

    showError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
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
              <Metric icon={<ClipboardList size={20} />} label="Open orders" value={openOrders.length.toString()} />
              <Metric icon={<Store size={20} />} label="Waiter calls" value={openWaiterCalls.length.toString()} />
              <Metric icon={<Utensils size={20} />} label="Menu items" value={activeItems.length.toString()} />
              <Metric icon={<Settings size={20} />} label="Direct ordering" value={settingsForm.enableDirectQrOrdering ? "On" : "Off"} />
            </section>

            <SetupChecklist
              hasProfile={Boolean(branch?.name && (branch.phoneNumber || branch.city))}
              hasMenu={activeCategories.length > 0 && activeItems.length > 0}
              hasTables={activeTables.length > 0}
              isOrderingEnabled={settingsForm.enableDirectQrOrdering}
              onOpenTab={setActiveTab}
            />

            <section className="space-y-gutter">
              <WorkspaceTabNav activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === "kitchen" ? (
                <OrdersPanel
                  isRefreshing={isRefreshingOrders}
                  isRealtimeConnected={isRealtimeConnected}
                  soundAlertsEnabled={soundAlertsEnabled}
                  highlightedOrderIds={highlightedOrderIds}
                  highlightedWaiterCallIds={highlightedWaiterCallIds}
                  lastRefreshedAt={lastOrdersRefreshAt}
                  orders={orders}
                  waiterCalls={waiterCalls}
                  savingKey={savingKey}
                  onToggleSoundAlerts={() => setSoundAlertsEnabled((current) => !current)}
                  onRefresh={() => void loadKitchenActivity()}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onUpdateWaiterCallStatus={handleUpdateWaiterCallStatus}
                />
              ) : null}

              {activeTab === "menu" ? (
                <MenuPanel
                  categories={activeCategories}
                  items={activeItems}
                  categoryForm={categoryForm}
                  itemForm={itemForm}
                  editingCategoryId={editingCategoryId}
                  editingCategoryForm={editingCategoryForm}
                  editingItemId={editingItemId}
                  editingItemForm={editingItemForm}
                  savingKey={savingKey}
                  onCategoryFormChange={setCategoryForm}
                  onItemFormChange={setItemForm}
                  onEditingCategoryFormChange={setEditingCategoryForm}
                  onEditingItemFormChange={setEditingItemForm}
                  onCreateCategory={handleCreateCategory}
                  onCreateItem={handleCreateItem}
                  onCancelEditCategory={() => setEditingCategoryId(null)}
                  onCancelEditItem={() => setEditingItemId(null)}
                  onDeactivateCategory={handleDeactivateCategory}
                  onDeactivateItem={handleDeactivateItem}
                  onSaveCategory={handleSaveCategory}
                  onSaveItem={handleSaveItem}
                  onStartEditCategory={handleStartEditCategory}
                  onStartEditItem={handleStartEditItem}
                />
              ) : null}

              {activeTab === "tables" ? (
                <TablesPanel
                  tables={activeTables}
                  form={tableForm}
                  savingKey={savingKey}
                  onFormChange={setTableForm}
                  onCreateTable={handleCreateTable}
                  onCopyQrLink={handleCopyQrLink}
                  onDownloadQr={handleDownloadQr}
                  onPrintQr={handlePrintQr}
                  onDeactivateTable={handleDeactivateTable}
                  onRegenerateQr={handleRegenerateQr}
                />
              ) : null}

              {activeTab === "settings" ? (
                <SettingsPanel
                  branchProfileForm={branchProfileForm}
                  form={settingsForm}
                  isSavingProfile={savingKey === "branch-profile"}
                  isSaving={savingKey === "settings"}
                  onBranchProfileChange={setBranchProfileForm}
                  onBranchProfileSubmit={handleSaveBranchProfile}
                  onChange={setSettingsForm}
                  onSubmit={handleSaveSettings}
                />
              ) : null}
            </section>
          </>
        )}
      </div>
      <FloatingFeedback feedback={feedback} onClose={() => setFeedback(null)} />
    </AdminShell>
  );
}

function WorkspaceTabNav({ activeTab, onChange }: { activeTab: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1 shadow-soft-saas">
      <div className="grid min-w-max grid-cols-4 gap-1">
        {WorkspaceTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
                isActive ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
              ].join(" ")}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MenuPanel({
  categories,
  items,
  categoryForm,
  itemForm,
  editingCategoryId,
  editingCategoryForm,
  editingItemId,
  editingItemForm,
  savingKey,
  onCategoryFormChange,
  onItemFormChange,
  onEditingCategoryFormChange,
  onEditingItemFormChange,
  onCreateCategory,
  onCreateItem,
  onCancelEditCategory,
  onCancelEditItem,
  onDeactivateCategory,
  onDeactivateItem,
  onSaveCategory,
  onSaveItem,
  onStartEditCategory,
  onStartEditItem
}: {
  categories: MenuCategory[];
  items: MenuItem[];
  categoryForm: CategoryForm;
  itemForm: ItemForm;
  editingCategoryId: string | null;
  editingCategoryForm: CategoryForm;
  editingItemId: string | null;
  editingItemForm: ItemForm;
  savingKey: string | null;
  onCategoryFormChange: (form: CategoryForm) => void;
  onItemFormChange: (form: ItemForm) => void;
  onEditingCategoryFormChange: (form: CategoryForm) => void;
  onEditingItemFormChange: (form: ItemForm) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateItem: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEditCategory: () => void;
  onCancelEditItem: () => void;
  onDeactivateCategory: (category: MenuCategory) => void;
  onDeactivateItem: (item: MenuItem) => void;
  onSaveCategory: (category: MenuCategory) => void;
  onSaveItem: (item: MenuItem) => void;
  onStartEditCategory: (category: MenuCategory) => void;
  onStartEditItem: (item: MenuItem) => void;
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
                    {editingItemId === item.menuItemId ? (
                      <TableCell colSpan={5} className="bg-surface-container-low/70">
                        <div className="grid gap-3 lg:grid-cols-2">
                          <Field label="Category">
                            <select
                              value={editingItemForm.menuCategoryId}
                              onChange={(event) => onEditingItemFormChange({ ...editingItemForm, menuCategoryId: event.target.value })}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              required
                            >
                              {categories.map((category) => (
                                <option key={category.menuCategoryId} value={category.menuCategoryId}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Item name">
                            <Input value={editingItemForm.name} onChange={(event) => onEditingItemFormChange({ ...editingItemForm, name: event.target.value })} required />
                          </Field>
                          <Field label="Description">
                            <Input value={editingItemForm.description} onChange={(event) => onEditingItemFormChange({ ...editingItemForm, description: event.target.value })} />
                          </Field>
                          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                            <Field label="Price">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingItemForm.price}
                                onChange={(event) => onEditingItemFormChange({ ...editingItemForm, price: event.target.value })}
                                required
                              />
                            </Field>
                            <Field label="Order">
                              <Input
                                type="number"
                                min="1"
                                value={editingItemForm.displayOrder}
                                onChange={(event) => onEditingItemFormChange({ ...editingItemForm, displayOrder: event.target.value })}
                                required
                              />
                            </Field>
                          </div>
                          <label className="flex h-10 items-center gap-3 text-sm font-semibold text-on-surface">
                            <input
                              type="checkbox"
                              checked={editingItemForm.isAvailable}
                              onChange={(event) => onEditingItemFormChange({ ...editingItemForm, isAvailable: event.target.checked })}
                              className="h-4 w-4 rounded border-outline-variant text-primary"
                            />
                            Available
                          </label>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onCancelEditItem}>
                              Cancel
                            </Button>
                            <Button type="button" onClick={() => onSaveItem(item)} disabled={savingKey === `item-edit-${item.menuItemId}`}>
                              {savingKey === `item-edit-${item.menuItemId}` ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                              Save
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <>
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
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => onStartEditItem(item)}
                              className="h-9 w-9 border-outline-variant/60"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil size={16} />
                            </Button>
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
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {categories.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div key={category.menuCategoryId} className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
                {editingCategoryId === category.menuCategoryId ? (
                  <div className="grid gap-3">
                    <Field label="Category name">
                      <Input value={editingCategoryForm.name} onChange={(event) => onEditingCategoryFormChange({ ...editingCategoryForm, name: event.target.value })} required />
                    </Field>
                    <Field label="Order">
                      <Input
                        type="number"
                        min="1"
                        value={editingCategoryForm.displayOrder}
                        onChange={(event) => onEditingCategoryFormChange({ ...editingCategoryForm, displayOrder: event.target.value })}
                        required
                      />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={onCancelEditCategory}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={() => onSaveCategory(category)} disabled={savingKey === `category-edit-${category.menuCategoryId}`}>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onStartEditCategory(category)}
                        className="h-8 w-8 border-outline-variant/60"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onDeactivateCategory(category)}
                        disabled={savingKey === `category-${category.menuCategoryId}`}
                        className="h-8 w-8 border-destructive/30 text-destructive"
                        aria-label={`Turn off ${category.name}`}
                      >
                        <Power size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SettingsPanel({
  branchProfileForm,
  form,
  isSavingProfile,
  isSaving,
  onBranchProfileChange,
  onBranchProfileSubmit,
  onChange,
  onSubmit
}: {
  branchProfileForm: BranchProfileForm;
  form: SettingsForm;
  isSavingProfile: boolean;
  isSaving: boolean;
  onBranchProfileChange: (form: BranchProfileForm) => void;
  onBranchProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (form: SettingsForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
        <CardHeader>
          <CardTitle className="text-headline-md text-primary">Branch profile</CardTitle>
          <CardDescription>These details appear on admin pages and printable table QR placards.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onBranchProfileSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="Branch name">
              <Input value={branchProfileForm.name} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, name: event.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={branchProfileForm.phoneNumber} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, phoneNumber: event.target.value })} />
            </Field>
            <Field label="Address line 1">
              <Input value={branchProfileForm.addressLine1} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, addressLine1: event.target.value })} />
            </Field>
            <Field label="Address line 2">
              <Input value={branchProfileForm.addressLine2} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, addressLine2: event.target.value })} />
            </Field>
            <Field label="City">
              <Input value={branchProfileForm.city} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, city: event.target.value })} />
            </Field>
            <Field label="State">
              <Input value={branchProfileForm.state} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, state: event.target.value })} />
            </Field>
            <Field label="Postal code">
              <Input value={branchProfileForm.postalCode} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, postalCode: event.target.value })} />
            </Field>
            <Field label="Country code">
              <Input value={branchProfileForm.countryCode} maxLength={2} onChange={(event) => onBranchProfileChange({ ...branchProfileForm, countryCode: event.target.value.toUpperCase() })} required />
            </Field>
            <Button type="submit" disabled={isSavingProfile} className="md:col-span-2">
              {isSavingProfile ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              Save Branch Profile
            </Button>
          </form>
        </CardContent>
      </Card>

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
    </div>
  );
}

type KitchenLane = {
  id: "Placed" | "Accepted" | "Preparing" | "Ready";
  title: string;
  description: string;
  icon: LucideIcon;
  nextStatus: OrderStatusCode;
  actionLabel: string;
};

const KitchenLanes: KitchenLane[] = [
  {
    id: "Placed",
    title: "New",
    description: "Waiting for staff confirmation",
    icon: Flame,
    nextStatus: "Accepted",
    actionLabel: "Accept"
  },
  {
    id: "Accepted",
    title: "Accepted",
    description: "Confirmed and queued",
    icon: CheckCircle2,
    nextStatus: "Preparing",
    actionLabel: "Start Preparing"
  },
  {
    id: "Preparing",
    title: "Preparing",
    description: "Currently in kitchen",
    icon: ChefHat,
    nextStatus: "Ready",
    actionLabel: "Mark Ready"
  },
  {
    id: "Ready",
    title: "Ready",
    description: "Ready to serve",
    icon: PackageCheck,
    nextStatus: "Completed",
    actionLabel: "Mark Served"
  }
];

const SecondaryOrderStatuses: OrderStatusCode[] = ["Cancelled"];

function OrdersPanel({
  isRefreshing,
  isRealtimeConnected,
  soundAlertsEnabled,
  highlightedOrderIds,
  highlightedWaiterCallIds,
  lastRefreshedAt,
  orders,
  waiterCalls,
  savingKey,
  onToggleSoundAlerts,
  onRefresh,
  onUpdateStatus,
  onUpdateWaiterCallStatus
}: {
  isRefreshing: boolean;
  isRealtimeConnected: boolean;
  soundAlertsEnabled: boolean;
  highlightedOrderIds: Set<string>;
  highlightedWaiterCallIds: Set<string>;
  lastRefreshedAt: Date | null;
  orders: AdminOrder[];
  waiterCalls: WaiterCall[];
  savingKey: string | null;
  onToggleSoundAlerts: () => void;
  onRefresh: () => void;
  onUpdateStatus: (order: AdminOrder, status: OrderStatusCode) => void;
  onUpdateWaiterCallStatus: (waiterCall: WaiterCall, status: WaiterCallStatusCode) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-headline-md text-primary">Kitchen orders</CardTitle>
            <CardDescription>
              {isRealtimeConnected ? "Live updates enabled" : "Auto-refreshes every 10 seconds"}
              {lastRefreshedAt ? ` · updated ${formatClockTime(lastRefreshedAt)}` : ""}.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant={soundAlertsEnabled ? "default" : "outline"} size="sm" onClick={onToggleSoundAlerts}>
              Sound {soundAlertsEnabled ? "On" : "Off"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : undefined} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <KitchenBoard
          orders={orders}
          waiterCalls={waiterCalls}
          highlightedOrderIds={highlightedOrderIds}
          highlightedWaiterCallIds={highlightedWaiterCallIds}
          savingKey={savingKey}
          onUpdateStatus={onUpdateStatus}
          onUpdateWaiterCallStatus={onUpdateWaiterCallStatus}
        />
      </CardContent>
    </Card>
  );
}

function KitchenBoard({
  orders,
  waiterCalls,
  highlightedOrderIds,
  highlightedWaiterCallIds,
  savingKey,
  onUpdateStatus,
  onUpdateWaiterCallStatus
}: {
  orders: AdminOrder[];
  waiterCalls: WaiterCall[];
  highlightedOrderIds: Set<string>;
  highlightedWaiterCallIds: Set<string>;
  savingKey: string | null;
  onUpdateStatus: (order: AdminOrder, status: OrderStatusCode) => void;
  onUpdateWaiterCallStatus: (waiterCall: WaiterCall, status: WaiterCallStatusCode) => void;
}) {
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "Completed" | "Cancelled">("all");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const activeOrders = orders
    .filter((order) => !["Completed", "Cancelled"].includes(order.orderStatusCode))
    .sort((a, b) => utcTimestamp(b.createdAtUtc) - utcTimestamp(a.createdAtUtc));
  const closedOrders = orders
    .filter((order) => ["Completed", "Cancelled"].includes(order.orderStatusCode))
    .sort((a, b) => utcTimestamp(b.updatedAtUtc ?? b.createdAtUtc) - utcTimestamp(a.updatedAtUtc ?? a.createdAtUtc));
  const filteredClosedOrders = closedOrders.filter((order) =>
    matchesOrderHistoryFilters(order, historySearch, historyStatus, historyFromDate, historyToDate)
  );
  const activeWaiterCalls = waiterCalls
    .filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode))
    .sort((a, b) => utcTimestamp(b.createdAtUtc) - utcTimestamp(a.createdAtUtc));
  const closedWaiterCalls = waiterCalls
    .filter((call) => ["Resolved", "Cancelled"].includes(call.statusCode))
    .sort((a, b) => utcTimestamp(b.updatedAtUtc ?? b.createdAtUtc) - utcTimestamp(a.updatedAtUtc ?? a.createdAtUtc));
  const orderCounts = KitchenLanes.reduce<Record<KitchenLane["id"], number>>(
    (counts, lane) => ({
      ...counts,
      [lane.id]: activeOrders.filter((order) => order.orderStatusCode === lane.id).length
    }),
    { Placed: 0, Accepted: 0, Preparing: 0, Ready: 0 }
  );

  return (
    <div className="space-y-3">
      <WaiterCallBoard
        activeCalls={activeWaiterCalls}
        closedCalls={closedWaiterCalls}
        highlightedWaiterCallIds={highlightedWaiterCallIds}
        savingKey={savingKey}
        onUpdateStatus={onUpdateWaiterCallStatus}
      />

      <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
        <div className="flex min-w-max items-center gap-2">
          <OrderCountChip label="Active orders" value={activeOrders.length} strong />
          {KitchenLanes.map((lane) => (
            <OrderCountChip key={lane.id} label={lane.title} value={orderCounts[lane.id]} />
          ))}
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <EmptyInlineState title="No active QR orders" description="New customer orders will appear in this board automatically. Keep sound on during service hours." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-4">
          {KitchenLanes.map((lane) => {
            const laneOrders = activeOrders.filter((order) => order.orderStatusCode === lane.id);
            const Icon = lane.icon;

            return (
              <section key={lane.id} className="min-w-0 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon size={17} className="shrink-0 text-primary" />
                      <h3 className="truncate text-sm font-extrabold text-on-surface">{lane.title}</h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">{lane.description}</p>
                  </div>
                  <Badge variant={laneOrders.length > 0 ? "success" : "secondary"}>{laneOrders.length}</Badge>
                </div>

                <div className="space-y-3">
                  {laneOrders.length === 0 ? (
                    <EmptyInlineState title="No orders" description={lane.id === "Placed" ? "Fresh orders land here first." : `Orders move here after ${lane.title.toLowerCase()} status.`} compact />
                  ) : (
                    laneOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.orderId}
                        order={order}
                        primaryStatus={lane.nextStatus}
                        primaryLabel={lane.actionLabel}
                        isHighlighted={highlightedOrderIds.has(order.orderId)}
                        savingKey={savingKey}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {closedOrders.length > 0 ? (
        <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-on-surface">Order history</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Search closed orders by table, customer, order id, status, or date.</p>
            </div>
            <Badge variant="secondary">{filteredClosedOrders.length}</Badge>
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_10rem_9rem_9rem]">
            <Input placeholder="Search orders" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} />
            <select
              value={historyStatus}
              onChange={(event) => setHistoryStatus(event.target.value as "all" | "Completed" | "Cancelled")}
              className="h-10 rounded-md border border-outline-variant/50 bg-white px-3 text-sm font-medium text-on-surface"
            >
              <option value="all">All status</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Input type="date" value={historyFromDate} onChange={(event) => setHistoryFromDate(event.target.value)} />
            <Input type="date" value={historyToDate} onChange={(event) => setHistoryToDate(event.target.value)} />
          </div>
          {filteredClosedOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant/40 bg-white/60 px-3 py-6 text-center text-xs text-on-surface-variant">
              No closed orders match these filters.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredClosedOrders.slice(0, 12).map((order) => (
                <ClosedOrderRow key={order.orderId} order={order} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function OrderCountChip({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${strong ? "bg-primary text-on-primary" : "bg-white text-on-surface"}`}>
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${strong ? "bg-white/20 text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
        {value}
      </span>
    </div>
  );
}

function WaiterCallBoard({
  activeCalls,
  closedCalls,
  highlightedWaiterCallIds,
  savingKey,
  onUpdateStatus
}: {
  activeCalls: WaiterCall[];
  closedCalls: WaiterCall[];
  highlightedWaiterCallIds: Set<string>;
  savingKey: string | null;
  onUpdateStatus: (waiterCall: WaiterCall, status: WaiterCallStatusCode) => void;
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Store size={17} className="text-primary" />
            <h3 className="text-sm font-extrabold text-on-surface">Waiter calls</h3>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Customer requests from QR tables.</p>
        </div>
        <Badge variant={activeCalls.length > 0 ? "success" : "secondary"}>{activeCalls.length}</Badge>
      </div>

      {activeCalls.length === 0 ? (
        <EmptyInlineState title="No active waiter calls" description="When a guest asks for help from the QR menu, it will appear here with sound and highlight alerts." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeCalls.map((call) => (
            <WaiterCallCard
              key={call.waiterCallId}
              waiterCall={call}
              isHighlighted={highlightedWaiterCallIds.has(call.waiterCallId)}
              savingKey={savingKey}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}

      {closedCalls.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {closedCalls.slice(0, 3).map((call) => (
            <div key={call.waiterCallId} className="rounded-lg border border-outline-variant/30 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-on-surface">{call.tableName}</p>
                <Badge variant={call.statusCode === "Cancelled" ? "outline" : "secondary"}>{call.statusCode}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WaiterCallCard({
  waiterCall,
  isHighlighted,
  savingKey,
  onUpdateStatus
}: {
  waiterCall: WaiterCall;
  isHighlighted: boolean;
  savingKey: string | null;
  onUpdateStatus: (waiterCall: WaiterCall, status: WaiterCallStatusCode) => void;
}) {
  const nextStatus: WaiterCallStatusCode = waiterCall.statusCode === "Open" ? "Acknowledged" : "Resolved";
  const nextLabel = waiterCall.statusCode === "Open" ? "Acknowledge" : "Resolve";
  const isNextSaving = savingKey === `waiter-call-${waiterCall.waiterCallId}-${nextStatus}`;
  const isCancelSaving = savingKey === `waiter-call-${waiterCall.waiterCallId}-Cancelled`;

  return (
    <article className={`rounded-lg border p-3 shadow-sm transition ${isHighlighted ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-outline-variant/30 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold text-on-surface">{waiterCall.tableName}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{formatDateTime(waiterCall.createdAtUtc)}</p>
        </div>
        <Badge variant={waiterCall.statusCode === "Open" ? "success" : "secondary"}>{waiterCall.statusCode}</Badge>
      </div>
      {waiterCall.customerName ? <p className="mt-2 text-sm font-semibold text-on-surface">{waiterCall.customerName}</p> : null}
      {waiterCall.note ? <p className="mt-2 rounded bg-surface-container-low p-2 text-xs leading-5 text-on-surface-variant">{waiterCall.note}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="w-full" disabled={isNextSaving} onClick={() => onUpdateStatus(waiterCall, nextStatus)}>
          {isNextSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          {nextLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-destructive/30 text-destructive"
          disabled={isCancelSaving}
          onClick={() => onUpdateStatus(waiterCall, "Cancelled")}
        >
          {isCancelSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          Cancel
        </Button>
      </div>
    </article>
  );
}

function KitchenOrderCard({
  order,
  primaryStatus,
  primaryLabel,
  isHighlighted,
  savingKey,
  onUpdateStatus
}: {
  order: AdminOrder;
  primaryStatus: OrderStatusCode;
  primaryLabel: string;
  isHighlighted: boolean;
  savingKey: string | null;
  onUpdateStatus: (order: AdminOrder, status: OrderStatusCode) => void;
}) {
  const isPrimarySaving = savingKey === `order-${order.orderId}-${primaryStatus}`;

  return (
    <article className={`rounded-lg border p-3 shadow-sm transition ${isHighlighted ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-outline-variant/30 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-on-surface">#{shortId(order.orderId)}</p>
            <Badge variant="outline" className="gap-1 border-outline-variant/50 text-on-surface-variant">
              <Clock3 size={12} />
              {formatDateTime(order.createdAtUtc)}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-on-surface">{order.tableName}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Status updated {formatDateTime(order.updatedAtUtc ?? order.createdAtUtc)}</p>
          {order.customerName || order.customerWhatsApp ? (
            <p className="mt-1 truncate text-xs text-on-surface-variant">{[order.customerName, order.customerWhatsApp].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-sm font-extrabold text-primary">{formatMoney(order.totalAmount)}</p>
      </div>

      <div className="mt-3 divide-y divide-outline-variant/30 border-t border-outline-variant/30">
        {order.items.map((item) => (
          <div key={item.orderItemId} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 break-words font-semibold text-on-surface">{item.menuItemName}</span>
            <span className="shrink-0 text-on-surface-variant">x{item.quantity}</span>
          </div>
        ))}
      </div>

      {order.notes ? <p className="mt-3 rounded bg-surface-container-low p-2 text-xs leading-5 text-on-surface-variant">{order.notes}</p> : null}

      <div className="mt-3 grid gap-2">
        <Button type="button" size="sm" disabled={isPrimarySaving} onClick={() => onUpdateStatus(order, primaryStatus)} className="w-full">
          {isPrimarySaving ? <Loader2 size={14} className="animate-spin" /> : null}
          {primaryLabel}
        </Button>
        {SecondaryOrderStatuses.map((status) => (
          <Button
            key={status}
            type="button"
            variant="outline"
            size="sm"
            disabled={savingKey === `order-${order.orderId}-${status}`}
            onClick={() => onUpdateStatus(order, status)}
            className="w-full border-destructive/30 text-destructive"
          >
            {savingKey === `order-${order.orderId}-${status}` ? <Loader2 size={14} className="animate-spin" /> : null}
            Cancel
          </Button>
        ))}
      </div>
    </article>
  );
}

function ClosedOrderRow({ order }: { order: AdminOrder }) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-on-surface">#{shortId(order.orderId)} · {order.tableName}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{formatDateTime(order.updatedAtUtc ?? order.createdAtUtc)}</p>
        </div>
        <Badge
          variant={order.orderStatusCode === "Cancelled" ? "outline" : "secondary"}
          className={order.orderStatusCode === "Cancelled" ? "border-destructive/30 text-destructive" : undefined}
        >
          {order.orderStatusCode}
        </Badge>
      </div>
    </div>
  );
}

function TablesPanel({
  tables,
  form,
  savingKey,
  onFormChange,
  onCreateTable,
  onCopyQrLink,
  onDownloadQr,
  onPrintQr,
  onDeactivateTable,
  onRegenerateQr
}: {
  tables: BranchTable[];
  form: TableForm;
  savingKey: string | null;
  onFormChange: (form: TableForm) => void;
  onCreateTable: (event: FormEvent<HTMLFormElement>) => void;
  onCopyQrLink: (table: BranchTable) => void;
  onDownloadQr: (table: BranchTable) => void;
  onPrintQr: (table: BranchTable) => void;
  onDeactivateTable: (table: BranchTable) => void;
  onRegenerateQr: (table: BranchTable) => void;
}) {
  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader>
        <CardTitle className="text-headline-md text-primary">Tables and QR</CardTitle>
        <CardDescription>Create table QR placards and copy customer menu links.</CardDescription>
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
                  <Button type="button" variant="outline" size="sm" onClick={() => onDownloadQr(table)}>
                    <Download size={15} />
                    Download Placard
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onPrintQr(table)}>
                    <Printer size={15} />
                    Print Placard
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

function SetupChecklist({
  hasProfile,
  hasMenu,
  hasTables,
  isOrderingEnabled,
  onOpenTab
}: {
  hasProfile: boolean;
  hasMenu: boolean;
  hasTables: boolean;
  isOrderingEnabled: boolean;
  onOpenTab: (tab: WorkspaceTab) => void;
}) {
  const items = [
    { label: "Complete branch profile", done: hasProfile, tab: "settings" as WorkspaceTab },
    { label: "Add menu categories and items", done: hasMenu, tab: "menu" as WorkspaceTab },
    { label: "Create table QR placards", done: hasTables, tab: "tables" as WorkspaceTab },
    { label: "Enable direct QR ordering", done: isOrderingEnabled, tab: "settings" as WorkspaceTab }
  ];
  const remaining = items.filter((item) => !item.done);

  if (remaining.length === 0) {
    return null;
  }

  return (
    <Card className="border-outline-variant/30 bg-surface-container-lowest shadow-soft-saas">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">Setup checklist</CardTitle>
        <CardDescription>Finish these steps so the branch is ready for live QR ordering.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onOpenTab(item.tab)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
                item.done ? "border-primary/20 bg-primary/5 text-primary" : "border-outline-variant/40 bg-white text-on-surface hover:border-primary/30"
              }`}
            >
              <span>{item.label}</span>
              {item.done ? <CheckCircle2 size={17} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0 text-on-surface-variant" />}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyInlineState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed border-outline-variant/40 bg-white/70 px-3 text-center ${compact ? "py-6" : "py-8"}`}>
      <p className="text-sm font-bold text-on-surface">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-on-surface-variant">{description}</p>
    </div>
  );
}

function FloatingFeedback({ feedback, onClose }: { feedback: FeedbackState | null; onClose: () => void }) {
  if (!feedback) {
    return null;
  }

  const isLoading = feedback.type === "loading";
  const isError = feedback.type === "error";

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm">
      <div
        className={`rounded-xl border bg-white p-4 shadow-2xl ${
          isError ? "border-destructive/30" : feedback.type === "success" ? "border-primary/30" : "border-outline-variant/40"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              isError ? "bg-destructive/10 text-destructive" : feedback.type === "success" ? "bg-primary/10 text-primary" : "bg-surface-container-low text-primary"
            }`}
          >
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : isError ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-on-surface">{isLoading ? "Working" : isError ? "Action failed" : "Done"}</p>
            <p className="mt-1 text-sm leading-5 text-on-surface-variant">{feedback.message}</p>
          </div>
          {!isLoading ? (
            <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low">
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
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

function toBranchProfileForm(branch: BranchListItem): BranchProfileForm {
  return {
    name: branch.name,
    phoneNumber: branch.phoneNumber ?? "",
    addressLine1: branch.addressLine1 ?? "",
    addressLine2: branch.addressLine2 ?? "",
    city: branch.city ?? "",
    state: branch.state ?? "",
    postalCode: branch.postalCode ?? "",
    countryCode: branch.countryCode ?? "IN"
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

function getSavingMessage(key: string): string {
  if (key === "branch-profile") {
    return "Saving branch profile...";
  }

  if (key === "settings") {
    return "Saving order settings...";
  }

  if (key === "category") {
    return "Adding menu category...";
  }

  if (key === "item") {
    return "Adding menu item...";
  }

  if (key === "table") {
    return "Adding table QR...";
  }

  if (key.startsWith("category-edit")) {
    return "Saving menu category...";
  }

  if (key.startsWith("item-edit")) {
    return "Saving menu item...";
  }

  if (key.startsWith("category-")) {
    return "Turning off menu category...";
  }

  if (key.startsWith("item-")) {
    return "Turning off menu item...";
  }

  if (key.startsWith("table-")) {
    return "Turning off table...";
  }

  if (key.startsWith("qr-")) {
    return "Regenerating QR token...";
  }

  if (key.startsWith("order-")) {
    return "Updating order status...";
  }

  if (key.startsWith("waiter-call-")) {
    return "Updating waiter call...";
  }

  return "Saving changes...";
}

function getQrMenuUrl(table: BranchTable): string {
  return `${window.location.origin}/qr/${table.qrToken}`;
}

function matchesOrderHistoryFilters(
  order: AdminOrder,
  search: string,
  status: "all" | "Completed" | "Cancelled",
  fromDate: string,
  toDate: string
): boolean {
  if (status !== "all" && order.orderStatusCode !== status) {
    return false;
  }

  const closedAt = parseUtcDate(order.updatedAtUtc ?? order.createdAtUtc);
  if (fromDate && closedAt < new Date(`${fromDate}T00:00:00`)) {
    return false;
  }

  if (toDate && closedAt > new Date(`${toDate}T23:59:59`)) {
    return false;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    order.orderId,
    shortId(order.orderId),
    order.tableName,
    order.customerName,
    order.customerWhatsApp,
    order.orderStatusCode,
    ...order.items.map((item) => item.menuItemName)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function playKitchenAlert(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.34);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.36);
    window.setTimeout(() => void audioContext.close(), 500);
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
}

function getQrContactLine(branch: BranchListItem | null): string {
  const email = getAdminEmailFromToken();
  return email ?? branch?.phoneNumber ?? "Scan to order";
}

function getAdminEmailFromToken(): string | null {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(window.atob(token.split(".")[1] ?? ""));
    const email = payload.email ?? payload.Email ?? payload.unique_name ?? payload.name;
    return typeof email === "string" && email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "qr-code";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function buildQrPlacardDataUrl(branchName: string, contactLine: string, tableName: string, url: string, qrDataUrl: string): Promise<string> {
  const qrImage = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1800;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#d9d4c8";
  context.lineWidth = 10;
  context.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  drawCenteredText(context, "SCAN ME", 600, 220, "bold 96px Arial", "#1f4f46", 1000);
  drawCenteredText(context, branchName, 600, 360, "bold 58px Arial", "#151515", 980);
  drawCenteredText(context, contactLine, 600, 445, "32px Arial", "#555555", 980);
  drawCenteredText(context, tableName, 600, 555, "bold 46px Arial", "#151515", 980);

  context.fillStyle = "#f8f5ee";
  context.fillRect(260, 650, 680, 680);
  context.drawImage(qrImage, 300, 690, 600, 600);

  drawCenteredText(context, "Scan this QR code to view the menu and place your order.", 600, 1440, "34px Arial", "#333333", 900);
  drawCenteredText(context, url, 600, 1530, "24px Arial", "#777777", 900);

  return canvas.toDataURL("image/png");
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = source;
  });
}

function drawCenteredText(context: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, maxWidth: number): void {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y, maxWidth);
}

function buildQrPrintHtml(title: string, branchName: string, contactLine: string, tableName: string, url: string, qrDataUrl: string): string {
  const safeTitle = escapeHtml(title);
  const safeBranchName = escapeHtml(branchName);
  const safeContactLine = escapeHtml(contactLine);
  const safeTableName = escapeHtml(tableName);
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #151515;
      }
      .sheet {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 24px;
        text-align: center;
      }
      .placard {
        box-sizing: border-box;
        width: min(92vw, 520px);
        min-height: min(92vh, 760px);
        border: 4px solid #d9d4c8;
        padding: 36px 28px;
      }
      .scan {
        margin: 0 0 18px;
        color: #1f4f46;
        font-size: 48px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .branch {
        margin: 0 0 8px;
        font-size: 32px;
        font-weight: 700;
      }
      .contact {
        margin: 0 0 22px;
        color: #555;
        font-size: 15px;
        overflow-wrap: anywhere;
      }
      .table {
        margin: 0 0 24px;
        font-size: 20px;
        font-weight: 600;
      }
      img {
        width: min(70vw, 340px);
        height: auto;
      }
      .hint {
        margin: 24px auto 0;
        max-width: 360px;
        color: #333;
        font-size: 16px;
        line-height: 1.5;
      }
      .url {
        margin: 16px auto 0;
        max-width: 420px;
        overflow-wrap: anywhere;
        color: #555;
        font-size: 13px;
      }
      @media print {
        .sheet {
          min-height: auto;
          padding: 10mm;
        }
        .placard {
          width: 100%;
          min-height: 257mm;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="placard">
        <p class="scan">SCAN ME</p>
        <h1 class="branch">${safeBranchName}</h1>
        <p class="contact">${safeContactLine}</p>
        <p class="table">${safeTableName}</p>
        <img src="${qrDataUrl}" alt="QR code for ${safeTableName}" />
        <p class="hint">Scan this QR code to view the menu and place your order.</p>
        <p class="url">${safeUrl}</p>
      </section>
    </main>
  </body>
</html>`;
}

function shortId(value: string): string {
  return value.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parseUtcDate(value));
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

function parseUtcDate(value: string): Date {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimeZone ? value : `${value}Z`);
}

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return value !== null && WorkspaceTabIds.has(value as WorkspaceTab);
}

function utcTimestamp(value: string): number {
  return parseUtcDate(value).getTime();
}
