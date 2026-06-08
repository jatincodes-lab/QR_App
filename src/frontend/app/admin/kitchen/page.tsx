"use client";

import { useEffect, useMemo, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { Bell, ChefHat, RefreshCw } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { getAdminOrders, updateAdminOrderStatus, type AdminOrder, type OrderStatusCode } from "../../../lib/api";
import { useAdminWorkspace } from "../../../lib/admin-workspace";
import { createAdminOrderConnection, stopConnection, type AdminOrderRealtimeEvent } from "../../../lib/realtime";

const KitchenNextStatus: Partial<Record<OrderStatusCode, OrderStatusCode>> = {
  Placed: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Served"
};

const KitchenColumns: { status: OrderStatusCode; title: string; helper: string }[] = [
  { status: "Placed", title: "Placed", helper: "Accept these first" },
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

  const kitchenOrders = useMemo(() => orders.filter((order) => ["Placed", "Accepted", "Preparing", "Ready"].includes(order.orderStatusCode)), [orders]);
  const placedCount = useMemo(() => kitchenOrders.filter((order) => order.orderStatusCode === "Placed").length, [kitchenOrders]);
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
      if (event.orderStatusCode === "Placed") {
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
              <MetricCard icon={<Bell size={20} />} label="New placed" value={isLoading ? "..." : String(placedCount)} />
              <MetricCard icon={<RefreshCw size={20} />} label="Ready" value={isLoading ? "..." : String(readyCount)} />
            </section>

            {newOrderNotice ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
                <Bell size={18} />
                <p className="text-sm font-extrabold">New order received</p>
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
                  <p className="mt-1 text-sm text-on-surface-variant">Placed orders will appear here automatically.</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-4">
                  {KitchenColumns.map((column) => (
                    <KitchenColumn
                      key={column.status}
                      column={column}
                      orders={ordersByStatus[column.status] ?? []}
                      savingKey={savingKey}
                      onMove={moveOrder}
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
  onMove
}: {
  column: { status: OrderStatusCode; title: string; helper: string };
  orders: AdminOrder[];
  savingKey: string | null;
  onMove: (order: AdminOrder, status: OrderStatusCode) => void;
}) {
  return (
    <section className="min-h-48 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-on-surface">{column.title}</h3>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{column.helper}</p>
        </div>
        <Badge variant={column.status === "Ready" ? "success" : column.status === "Placed" ? "secondary" : "outline"}>{orders.length}</Badge>
      </div>

      <div className="grid gap-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant/70 bg-white p-4 text-center text-xs font-semibold text-on-surface-variant">
            No {column.title.toLowerCase()} orders
          </div>
        ) : (
          orders.map((order) => <KitchenTicket key={order.orderId} order={order} savingKey={savingKey} onMove={onMove} />)
        )}
      </div>
    </section>
  );
}

function KitchenTicket({ order, savingKey, onMove }: { order: AdminOrder; savingKey: string | null; onMove: (order: AdminOrder, status: OrderStatusCode) => void }) {
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

      {nextStatus ? (
        <Button type="button" className="mt-4 h-12 w-full" disabled={savingKey === order.orderId} onClick={() => onMove(order, nextStatus)}>
          {nextStatus === "Accepted" ? "Accept order" : `Move to ${nextStatus}`}
        </Button>
      ) : null}
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
