"use client";

import { useEffect, useMemo, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { ClipboardList, RefreshCw, Store, Users } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  getAdminOrders,
  getWaiterCalls,
  updateAdminOrderStatus,
  updateWaiterCallStatus,
  type AdminOrder,
  type OrderStatusCode,
  type WaiterCall,
  type WaiterCallStatusCode
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { createAdminOrderConnection, stopConnection, type AdminOrderRealtimeEvent, type AdminWaiterCallRealtimeEvent } from "../../../lib/realtime";

const OrderNextStatus: Partial<Record<OrderStatusCode, OrderStatusCode>> = {
  Placed: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Completed"
};

const WaiterNextStatus: Partial<Record<WaiterCallStatusCode, WaiterCallStatusCode>> = {
  Open: "Acknowledged",
  Acknowledged: "Resolved"
};

export default function AdminOrdersPage() {
  const workspace = useAdminWorkspace();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "offline">("offline");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const activeOrders = useMemo(() => orders.filter((order) => !["Completed", "Cancelled"].includes(order.orderStatusCode)), [orders]);
  const activeCalls = useMemo(() => waiterCalls.filter((call) => !["Resolved", "Cancelled"].includes(call.statusCode)), [waiterCalls]);
  const totalOpenValue = useMemo(() => activeOrders.reduce((total, order) => total + order.totalAmount, 0), [activeOrders]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setOrders([]);
      setWaiterCalls([]);
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
      connection.on("WaiterCallCreated", (event: AdminWaiterCallRealtimeEvent) => handleRealtimeWaiterCall(event, branchId));
      connection.on("WaiterCallStatusUpdated", (event: AdminWaiterCallRealtimeEvent) => handleRealtimeWaiterCall(event, branchId));
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

  function handleRealtimeOrder(event: AdminOrderRealtimeEvent, branchId: string) {
    if (event.branchId !== branchId) {
      return;
    }

    void loadOrders(branchId);
  }

  function handleRealtimeWaiterCall(event: AdminWaiterCallRealtimeEvent, branchId: string) {
    if (event.branchId !== branchId) {
      return;
    }

    void loadOrders(branchId);
  }

  async function loadOrders(branchId: string) {
    setIsLoadingOrders(true);

    try {
      const [orderResponse, callResponse] = await Promise.all([getAdminOrders(branchId, true), getWaiterCalls(branchId, true)]);
      setOrders(orderResponse);
      setWaiterCalls(callResponse);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingOrders(false);
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

  async function moveWaiterCall(call: WaiterCall, status: WaiterCallStatusCode) {
    if (!workspace.selectedBranch) {
      return;
    }

    setSavingKey(call.waiterCallId);
    try {
      const updated = await updateWaiterCallStatus(workspace.selectedBranch.branchId, call.waiterCallId, status);
      setWaiterCalls((current) => current.map((item) => (item.waiterCallId === updated.waiterCallId ? updated : item)));
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  const branchName = workspace.selectedBranch?.name ?? "Orders";

  return (
    <AdminShell
      active="orders"
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
              <ClipboardList size={14} />
              Orders
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Kitchen board</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Track live QR orders and waiter calls for the selected branch.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Badge variant={liveState === "live" ? "default" : "outline"}>{liveState === "live" ? "Live" : liveState === "connecting" ? "Connecting" : "Manual refresh"}</Badge>
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
              <MetricCard icon={<ClipboardList size={20} />} label="Active orders" value={isLoadingOrders ? "..." : String(activeOrders.length)} />
              <MetricCard icon={<Store size={20} />} label="Open value" value={isLoadingOrders ? "..." : formatMoney(totalOpenValue)} />
              <MetricCard icon={<Users size={20} />} label="Waiter calls" value={isLoadingOrders ? "..." : String(activeCalls.length)} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Orders</CardTitle>
                  <CardDescription>Move each order through the kitchen workflow.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {isLoadingOrders ? (
                    <PageLoading />
                  ) : activeOrders.length === 0 ? (
                    <EmptyPanel title="No active orders" text="New QR orders will appear here." />
                  ) : (
                    activeOrders.map((order) => <OrderCard key={order.orderId} order={order} savingKey={savingKey} onMove={moveOrder} />)
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Waiter calls</CardTitle>
                  <CardDescription>Customer requests from QR tables.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {isLoadingOrders ? (
                    <PageLoading />
                  ) : activeCalls.length === 0 ? (
                    <EmptyPanel title="No active calls" text="Waiter requests will appear here." />
                  ) : (
                    activeCalls.map((call) => <WaiterCallCard key={call.waiterCallId} call={call} savingKey={savingKey} onMove={moveWaiterCall} />)
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function OrderCard({ order, savingKey, onMove }: { order: AdminOrder; savingKey: string | null; onMove: (order: AdminOrder, status: OrderStatusCode) => void }) {
  const nextStatus = OrderNextStatus[order.orderStatusCode as OrderStatusCode];

  return (
    <article className="rounded-xl border border-outline-variant/70 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-on-surface">{order.tableName} - #{shortOrderCode(order.orderId)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{order.customerName || "Guest"} - {formatAdminDate(order.createdAtUtc)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{order.orderStatusCode}</Badge>
          <p className="text-sm font-extrabold text-primary">{formatMoney(order.totalAmount)}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
        {order.items.map((item) => (
          <div key={item.orderItemId}>
            <span>{item.quantity}x {formatAdminOrderItemName(item.menuItemName, item.variantName)}</span>
            {item.itemNote ? <span className="ml-2 font-bold text-primary">Note: {item.itemNote}</span> : null}
          </div>
        ))}
      </div>
      {nextStatus ? (
        <Button type="button" size="sm" className="mt-3" disabled={savingKey === order.orderId} onClick={() => onMove(order, nextStatus)}>
          Move to {nextStatus}
        </Button>
      ) : null}
    </article>
  );
}

function WaiterCallCard({ call, savingKey, onMove }: { call: WaiterCall; savingKey: string | null; onMove: (call: WaiterCall, status: WaiterCallStatusCode) => void }) {
  const nextStatus = WaiterNextStatus[call.statusCode];

  return (
    <article className="rounded-xl border border-outline-variant/70 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-on-surface">{call.tableName}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{call.customerName || "Guest"} - {formatAdminDate(call.createdAtUtc)}</p>
        </div>
        <Badge variant="outline">{call.statusCode}</Badge>
      </div>
      {call.note ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">{call.note}</p> : null}
      {nextStatus ? (
        <Button type="button" size="sm" className="mt-3" disabled={savingKey === call.waiterCallId} onClick={() => onMove(call, nextStatus)}>
          Move to {nextStatus}
        </Button>
      ) : null}
    </article>
  );
}

function EmptyPanel({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
      <p className="text-sm font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{text}</p>
    </div>
  );
}

function formatAdminOrderItemName(name: string, variantName: string | null): string {
  return variantName ? `${name} - ${variantName}` : name;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
