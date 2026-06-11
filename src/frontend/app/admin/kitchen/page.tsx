"use client";

import { useEffect, useMemo, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { Bell, ChefHat, Printer, RefreshCw } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { getAdminOrders, updateAdminOrderStatus, type AdminOrder, type BranchListItem, type OrderStatusCode } from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { createAdminOrderConnection, stopConnection, type AdminOrderRealtimeEvent } from "../../../lib/realtime";

const KitchenNextStatus: Partial<Record<OrderStatusCode, OrderStatusCode>> = {
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Served"
};

const KitchenColumns: { status: OrderStatusCode; title: string; helper: string }[] = [
  { status: "Accepted", title: "Accepted", helper: "Ready to prep" },
  { status: "Preparing", title: "Preparing", helper: "Being cooked" },
  { status: "Ready", title: "Ready", helper: "Send to table" }
];

export default function AdminKitchenPage() {
  const workspace = useAdminWorkspace();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "offline">("offline");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newOrderNotice, setNewOrderNotice] = useState(false);

  const kitchenOrders = useMemo(() => orders.filter((order) => ["Accepted", "Preparing", "Ready"].includes(order.orderStatusCode)), [orders]);
  const acceptedCount = useMemo(() => kitchenOrders.filter((order) => order.orderStatusCode === "Accepted").length, [kitchenOrders]);
  const readyCount = useMemo(() => kitchenOrders.filter((order) => order.orderStatusCode === "Ready").length, [kitchenOrders]);
  const ordersByStatus = useMemo(
    () =>
      KitchenColumns.reduce<Record<OrderStatusCode, AdminOrder[]>>((lookup, column) => {
        lookup[column.status] = kitchenOrders.filter((order) => order.orderStatusCode === column.status);
        return lookup;
      }, {} as Record<OrderStatusCode, AdminOrder[]>),
    [kitchenOrders]
  );

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setOrders([]);
      return;
    }

    void loadOrders(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setLiveState("offline");
      return;
    }

    let isDisposed = false;
    let connection: HubConnection | null = null;
    const branchId = workspace.selectedBranch.branchId;

    async function connect() {
      setLiveState("connecting");
      connection = createAdminOrderConnection();
      connection.on("OrderCreated", (event: AdminOrderRealtimeEvent) => handleRealtimeOrder(event, branchId));
      connection.on("OrderStatusUpdated", (event: AdminOrderRealtimeEvent) => handleRealtimeOrder(event, branchId));
      connection.onreconnected(async () => {
        if (!isDisposed && connection) {
          await connection.invoke("JoinBranch", branchId);
          setLiveState("live");
          void loadOrders(branchId);
        }
      });
      connection.onclose(() => {
        if (!isDisposed) {
          setLiveState("offline");
        }
      });

      try {
        await connection.start();
        await connection.invoke("JoinBranch", branchId);
        if (!isDisposed) {
          setLiveState("live");
        }
      } catch {
        if (!isDisposed) {
          setLiveState("offline");
        }
      }
    }

    void connect();

    return () => {
      isDisposed = true;
      if (connection) {
        void stopConnection(connection);
      }
    };
  }, [workspace.selectedBranch?.branchId]);

  async function loadOrders(branchId: string) {
    setIsLoading(true);

    try {
      setOrders(await getAdminOrders(branchId, false));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoading(false);
    }
  }

  function handleRealtimeOrder(event: AdminOrderRealtimeEvent, branchId: string) {
    if (event.branchId === branchId) {
      if (event.orderStatusCode === "Accepted") {
        setNewOrderNotice(true);
        playOrderTone();
        window.setTimeout(() => setNewOrderNotice(false), 7_000);
      }

      void loadOrders(branchId);
    }
  }

  async function moveOrder(order: AdminOrder, status: OrderStatusCode) {
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey(order.orderId);
    try {
      const updated = await updateAdminOrderStatus(workspace.selectedBranch.branchId, order.orderId, status);
      setOrders((current) => current.map((item) => (item.orderId === updated.orderId ? updated : item)));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  function printKot(order: AdminOrder) {
    if (!workspace.selectedBranch || !["Accepted", "Preparing", "Ready"].includes(order.orderStatusCode)) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      window.alert("Print popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    printWindow.document.write(buildKotPrintHtml(workspace.selectedBranch, order));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  const branchName = workspace.selectedBranch?.name ?? "Kitchen";

  return (
    <AdminShell
      active="kitchen"
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
              Kitchen
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Kitchen prep view</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Preparation-focused order board with table, item, variant, quantity, and customer notes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={liveState === "live" ? "success" : "outline"}>{liveState === "live" ? "Live" : liveState === "connecting" ? "Connecting" : "Offline"}</Badge>
            <Button type="button" variant="outline" onClick={() => workspace.selectedBranch && loadOrders(workspace.selectedBranch.branchId)}>
              <RefreshCw size={17} />
              Refresh
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
              <MetricCard icon={<ChefHat size={20} />} label="Kitchen tickets" value={isLoading ? "..." : String(kitchenOrders.length)} />
              <MetricCard icon={<Bell size={20} />} label="Accepted" value={isLoading ? "..." : String(acceptedCount)} />
              <MetricCard icon={<RefreshCw size={20} />} label="Ready" value={isLoading ? "..." : String(readyCount)} />
            </section>

            {newOrderNotice ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
                <Bell size={18} />
                <p className="text-sm font-extrabold">New kitchen ticket received</p>
              </div>
            ) : null}

            <section className="space-y-4">
              <div>
                <h2 className="text-title-lg text-primary">Live kitchen board</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Completed and cancelled orders stay hidden by default.</p>
              </div>

              {isLoading ? (
                <PageLoading />
              ) : kitchenOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
                  <p className="text-sm font-bold text-on-surface">No active kitchen tickets</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Accepted orders will appear here automatically.</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-3">
                  {KitchenColumns.map((column) => (
                    <KitchenColumn
                      key={column.status}
                      column={column}
                      orders={ordersByStatus[column.status] ?? []}
                      savingKey={savingKey}
                      onMove={moveOrder}
                      onPrint={printKot}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function KitchenColumn({
  column,
  orders,
  savingKey,
  onMove,
  onPrint
}: {
  column: { status: OrderStatusCode; title: string; helper: string };
  orders: AdminOrder[];
  savingKey: string | null;
  onMove: (order: AdminOrder, status: OrderStatusCode) => void;
  onPrint: (order: AdminOrder) => void;
}) {
  return (
    <section className="min-h-48 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-on-surface">{column.title}</h3>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{column.helper}</p>
        </div>
        <Badge variant={column.status === "Ready" ? "success" : "outline"}>{orders.length}</Badge>
      </div>

      <div className="grid gap-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant/70 bg-white p-4 text-center text-xs font-semibold text-on-surface-variant">
            No {column.title.toLowerCase()} orders
          </div>
        ) : (
          orders.map((order) => <KitchenTicket key={order.orderId} order={order} savingKey={savingKey} onMove={onMove} onPrint={onPrint} />)
        )}
      </div>
    </section>
  );
}

function KitchenTicket({
  order,
  savingKey,
  onMove,
  onPrint
}: {
  order: AdminOrder;
  savingKey: string | null;
  onMove: (order: AdminOrder, status: OrderStatusCode) => void;
  onPrint: (order: AdminOrder) => void;
}) {
  const nextStatus = KitchenNextStatus[order.orderStatusCode as OrderStatusCode];
  const minutesWaiting = Math.max(0, Math.round((Date.now() - new Date(order.createdAtUtc).getTime()) / 60000));

  return (
    <article className="rounded-lg border border-outline-variant/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-on-surface">{order.tableName} - #{shortOrderCode(order.orderId)}</p>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{minutesWaiting} min waiting - {formatKitchenDate(order.createdAtUtc)}</p>
        </div>
        <Badge variant={order.orderStatusCode === "Ready" ? "success" : "outline"}>{order.orderStatusCode}</Badge>
      </div>

      <div className="mt-4 divide-y divide-outline-variant/40 rounded-lg border border-outline-variant/50">
        {order.items.map((item) => (
          <div key={item.orderItemId} className="grid gap-1 p-3">
            <p className="text-sm font-extrabold text-on-surface">
              {item.quantity}x {formatKitchenItemName(item.menuItemName, item.variantName)}
            </p>
            {item.itemNote ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">Note: {item.itemNote}</p> : null}
          </div>
        ))}
      </div>

      {order.notes ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs font-semibold text-on-surface-variant">Order note: {order.notes}</p> : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-12 w-full" onClick={() => onPrint(order)}>
          <Printer size={16} />
          Print KOT
        </Button>
        {nextStatus ? (
          <Button type="button" className="h-12 w-full" disabled={savingKey === order.orderId} onClick={() => onMove(order, nextStatus)}>
            {`Move to ${nextStatus}`}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function formatKitchenItemName(name: string, variantName: string | null): string {
  return variantName ? `${name} - ${variantName}` : name;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatKitchenDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeStyle: "short"
  }).format(new Date(value));
}

function formatKitchenPrintDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildKotPrintHtml(branch: BranchListItem, order: AdminOrder): string {
  const branchAddress = [branch.addressLine1, branch.addressLine2, branch.city, branch.state, branch.postalCode].filter(Boolean).join(", ");
  const rows = order.items.length > 0
    ? order.items
        .map(
          (item) => `<div class="item">
            <div class="qty">${item.quantity}x</div>
            <div class="details">
              <p>${escapeHtml(formatKitchenItemName(item.menuItemName, item.variantName))}</p>
              ${item.itemNote ? `<strong>NOTE: ${escapeHtml(item.itemNote)}</strong>` : ""}
            </div>
          </div>`
        )
        .join("")
    : `<div class="empty">No items found for this KOT.</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>KOT-${shortOrderCode(order.orderId)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eeeeee; color: #111; font-family: Arial, Helvetica, sans-serif; }
      main { width: 80mm; margin: 0 auto; background: #fff; padding: 5mm 4mm 6mm; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 19px; font-weight: 900; line-height: 1.15; text-align: center; text-transform: uppercase; }
      .muted { color: #555; font-size: 10.5px; line-height: 1.35; text-align: center; }
      .kot-title { border-bottom: 3px solid #111; border-top: 3px solid #111; margin-top: 10px; padding: 8px 0; text-align: center; }
      .kot-title h2 { font-size: 22px; font-weight: 900; letter-spacing: 0.22em; }
      .kot-title p { font-size: 12px; font-weight: 900; margin-top: 2px; }
      .meta { border: 2px solid #111; display: grid; gap: 5px; margin-top: 10px; padding: 8px; }
      .line { display: flex; font-size: 12px; justify-content: space-between; gap: 10px; }
      .line strong { text-align: right; }
      .status { background: #111; color: #fff; font-size: 12px; font-weight: 900; margin-top: 8px; padding: 7px; text-align: center; text-transform: uppercase; }
      .items { border-bottom: 2px solid #111; border-top: 2px solid #111; margin-top: 12px; }
      .item { display: grid; grid-template-columns: 12mm minmax(0, 1fr); gap: 7px; padding: 9px 0; }
      .item + .item { border-top: 1px dashed #999; }
      .qty { border: 2px solid #111; display: grid; font-size: 17px; font-weight: 900; min-height: 10mm; place-items: center; }
      .details p { font-size: 16px; font-weight: 900; line-height: 1.18; overflow-wrap: anywhere; text-transform: uppercase; }
      .details strong { background: #fff3cd; border: 1px solid #111; display: block; font-size: 12px; line-height: 1.25; margin-top: 5px; overflow-wrap: anywhere; padding: 5px; }
      .order-note { border: 2px solid #111; font-size: 12px; font-weight: 900; line-height: 1.35; margin-top: 10px; overflow-wrap: anywhere; padding: 7px; }
      .empty { font-size: 13px; font-weight: 900; padding: 12px 0; text-align: center; }
      .footer { border-top: 1px dashed #111; margin-top: 12px; padding-top: 8px; text-align: center; }
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body { background: #fff; }
        main { margin: 0; padding: 4mm 3mm; width: 80mm; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(branch.name)}</h1>
      ${branchAddress ? `<p class="muted">${escapeHtml(branchAddress)}</p>` : ""}
      <div class="kot-title">
        <h2>KOT</h2>
        <p>#${shortOrderCode(order.orderId)}</p>
      </div>
      <section class="meta">
        <div class="line"><span>Table</span><strong>${escapeHtml(order.tableName)}</strong></div>
        <div class="line"><span>Order time</span><strong>${escapeHtml(formatKitchenPrintDate(order.createdAtUtc))}</strong></div>
        <div class="line"><span>Customer</span><strong>${escapeHtml(order.customerName || "Guest")}</strong></div>
      </section>
      <div class="status">${escapeHtml(order.orderStatusCode)}</div>
      <section class="items">${rows}</section>
      ${order.notes ? `<div class="order-note">ORDER NOTE: ${escapeHtml(order.notes)}</div>` : ""}
      <div class="footer">
        <p class="muted">Kitchen copy - no prices</p>
        <p class="muted">Printed ${escapeHtml(formatKitchenPrintDate(new Date().toISOString()))}</p>
      </div>
    </main>
  </body>
</html>`;
}

function playOrderTone() {
  try {
    const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  } catch {
    // Browser autoplay rules can block audio until staff interacts with the page.
  }
}
