"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { Ban, ClipboardList, Loader2, Printer, ReceiptText, RefreshCw, Store, Users, X } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  generateOrderBill,
  getAdminOrders,
  getBranchBillingSettings,
  getOrderBill,
  getWaiterCalls,
  updateAdminOrderStatus,
  updateOrderBillPaymentStatus,
  updateOrderBillRefundStatus,
  updateWaiterCallStatus,
  type AdminOrder,
  type BranchBillingSettings,
  type BranchListItem,
  type OrderBill,
  type OrderStatusCode,
  type PaymentStatusCode,
  type RefundStatusCode,
  type WaiterCall,
  type WaiterCallStatusCode
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { createAdminOrderConnection, stopConnection, type AdminOrderRealtimeEvent, type AdminWaiterCallRealtimeEvent } from "../../../lib/realtime";

const OrderNextStatus: Partial<Record<OrderStatusCode, OrderStatusCode>> = {
  Placed: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Served",
  Served: "Completed"
};

const WaiterNextStatus: Partial<Record<WaiterCallStatusCode, WaiterCallStatusCode>> = {
  Open: "Acknowledged",
  Acknowledged: "Resolved"
};

type BillDialogState = {
  order: AdminOrder;
  bill: OrderBill | null;
  discountAmount: string;
  serviceChargeAmount: string;
  paymentStatusCode: PaymentStatusCode;
  paymentMethod: string;
  reason: string;
  paymentReason: string;
  refundStatusCode: RefundStatusCode;
  refundAmount: string;
  refundReason: string;
  isLoading: boolean;
};

type OrderActionDialogState = {
  order: AdminOrder;
  status: OrderStatusCode;
  reason: string;
};

export default function AdminOrdersPage() {
  const workspace = useAdminWorkspace();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [billingSettings, setBillingSettings] = useState<BranchBillingSettings | null>(null);
  const [billDialog, setBillDialog] = useState<BillDialogState | null>(null);
  const [orderAction, setOrderAction] = useState<OrderActionDialogState | null>(null);
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
      setBillingSettings(null);
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
      const [orderResponse, callResponse, billingResponse] = await Promise.all([getAdminOrders(branchId, true), getWaiterCalls(branchId, true), getBranchBillingSettings(branchId)]);
      setOrders(orderResponse);
      setWaiterCalls(callResponse);
      setBillingSettings(billingResponse);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  function requestMoveOrder(order: AdminOrder, status: OrderStatusCode) {
    if (status === "Cancelled") {
      setOrderAction({ order, status, reason: "" });
      return;
    }

    void moveOrder(order, status);
  }

  async function moveOrder(order: AdminOrder, status: OrderStatusCode, reason: string | null = null): Promise<boolean> {
    if (!workspace.selectedBranch) {
      return false;
    }

    setSavingKey(order.orderId);
    try {
      const updated = await updateAdminOrderStatus(workspace.selectedBranch.branchId, order.orderId, status, reason);
      setOrders((current) => current.map((item) => (item.orderId === updated.orderId ? updated : item)));
      return true;
    } catch (caught) {
      workspace.handleApiError(caught);
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  async function confirmOrderAction() {
    if (!orderAction) {
      return;
    }

    const reason = orderAction.reason.trim();
    if (!reason) {
      workspace.setWorkspaceError("Cancellation reason is required.");
      return;
    }

    const wasUpdated = await moveOrder(orderAction.order, orderAction.status, reason);
    if (wasUpdated) {
      setOrderAction(null);
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

  async function openBill(order: AdminOrder) {
    if (!workspace.selectedBranch) {
      return;
    }

    const appliedOfferDiscount = roundMoney(order.appliedOfferDiscountAmount ?? 0);
    const serviceChargeBase = Math.max(0, order.subtotalAmount - appliedOfferDiscount);
    const defaultServiceCharge = billingSettings?.serviceChargeEnabled ? roundMoney(serviceChargeBase * billingSettings.serviceChargeRate / 100) : 0;
    setBillDialog({
      order,
      bill: null,
      discountAmount: String(appliedOfferDiscount),
      serviceChargeAmount: defaultServiceCharge.toFixed(2),
      paymentStatusCode: "Unpaid",
      paymentMethod: "",
      reason: "",
      paymentReason: "",
      refundStatusCode: "NotRefunded",
      refundAmount: "0",
      refundReason: "",
      isLoading: true
    });

    try {
      const bill = await getOrderBill(workspace.selectedBranch.branchId, order.orderId);
      setBillDialog({
        order,
        bill,
        discountAmount: String(bill?.discountAmount ?? appliedOfferDiscount),
        serviceChargeAmount: String(bill?.serviceChargeAmount ?? defaultServiceCharge),
        paymentStatusCode: bill?.paymentStatusCode ?? "Unpaid",
        paymentMethod: bill?.paymentMethod ?? "",
        reason: "",
        paymentReason: "",
        refundStatusCode: bill?.refundStatusCode ?? "NotRefunded",
        refundAmount: String(bill?.refundAmount ?? 0),
        refundReason: bill?.refundReason ?? "",
        isLoading: false
      });
    } catch (caught) {
      workspace.handleApiError(caught);
      setBillDialog(null);
    }
  }

  async function generateBill() {
    if (!workspace.selectedBranch || !billDialog) {
      return;
    }

    setSavingKey(`bill-${billDialog.order.orderId}`);
    try {
      const bill = await generateOrderBill(workspace.selectedBranch.branchId, billDialog.order.orderId, {
        discountAmount: Number(billDialog.discountAmount) || 0,
        serviceChargeAmount: Number(billDialog.serviceChargeAmount) || 0,
        overrideReason: billDialog.reason.trim() || null
      });

      setOrders((current) => current.map((order) => (order.orderId === bill.orderId ? { ...order, totalAmount: bill.totalAmount } : order)));
      setBillDialog({
        ...billDialog,
        bill,
        paymentStatusCode: bill.paymentStatusCode,
        paymentMethod: bill.paymentMethod ?? "",
        refundStatusCode: bill.refundStatusCode,
        refundAmount: String(bill.refundAmount),
        refundReason: bill.refundReason ?? "",
        isLoading: false
      });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function savePaymentStatus() {
    if (!workspace.selectedBranch || !billDialog?.bill) {
      return;
    }

    const paymentReason = billDialog.paymentReason.trim();
    if (billDialog.paymentStatusCode === "Voided" && !paymentReason) {
      workspace.setWorkspaceError("Void reason is required.");
      return;
    }

    setSavingKey(`payment-${billDialog.order.orderId}`);
    try {
      const bill = await updateOrderBillPaymentStatus(workspace.selectedBranch.branchId, billDialog.order.orderId, {
        paymentStatusCode: billDialog.paymentStatusCode,
        paymentMethod: billDialog.paymentMethod.trim() || null,
        reason: paymentReason || null
      });
      setBillDialog({ ...billDialog, bill, paymentStatusCode: bill.paymentStatusCode, paymentMethod: bill.paymentMethod ?? "", paymentReason: "" });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function saveRefundStatus() {
    if (!workspace.selectedBranch || !billDialog?.bill) {
      return;
    }

    const refundAmount = roundMoney(Number(billDialog.refundAmount) || 0);
    const totalAmount = roundMoney(billDialog.bill.totalAmount);
    const reason = billDialog.refundReason.trim();

    if (billDialog.refundStatusCode !== "NotRefunded" && !reason) {
      workspace.setWorkspaceError("Refund reason is required.");
      return;
    }

    if (billDialog.refundStatusCode === "NotRefunded" && refundAmount !== 0) {
      workspace.setWorkspaceError("Refund amount must be 0 when status is not refunded.");
      return;
    }

    if (billDialog.refundStatusCode === "PartiallyRefunded" && (refundAmount <= 0 || refundAmount >= totalAmount)) {
      workspace.setWorkspaceError("Partial refund amount must be greater than 0 and less than the bill total.");
      return;
    }

    if (billDialog.refundStatusCode === "Refunded" && refundAmount !== totalAmount) {
      workspace.setWorkspaceError("Full refund amount must equal the bill total.");
      return;
    }

    setSavingKey(`refund-${billDialog.order.orderId}`);
    try {
      const bill = await updateOrderBillRefundStatus(workspace.selectedBranch.branchId, billDialog.order.orderId, {
        refundStatusCode: billDialog.refundStatusCode,
        refundAmount,
        reason: reason || null
      });
      setBillDialog({
        ...billDialog,
        bill,
        refundStatusCode: bill.refundStatusCode,
        refundAmount: String(bill.refundAmount),
        refundReason: bill.refundReason ?? ""
      });
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  function printBill() {
    if (!workspace.selectedBranch || !billDialog?.bill) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(buildBillPrintHtml(workspace.selectedBranch, billDialog.order, billDialog.bill));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-outline-variant/70 bg-white px-4 text-sm font-bold text-on-surface shadow-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  liveState === "live" ? "bg-brand-mint" : liveState === "connecting" ? "bg-accent" : "bg-on-surface-variant/35"
                }`}
                aria-hidden="true"
              />
              {liveState === "live" ? "Live" : liveState === "connecting" ? "Connecting" : "Manual refresh"}
            </div>
            <Button type="button" variant="outline" onClick={() => workspace.selectedBranch && loadOrders(workspace.selectedBranch.branchId)} className="h-11 border-outline-variant/70 bg-white">
              <RefreshCw size={17} className={isLoadingOrders ? "animate-spin" : ""} />
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
                    activeOrders.map((order) => <OrderCard key={order.orderId} order={order} savingKey={savingKey} onBill={openBill} onMove={requestMoveOrder} />)
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
      {billDialog ? (
        <BillDialog
          state={billDialog}
          savingKey={savingKey}
          onChange={setBillDialog}
          onClose={() => setBillDialog(null)}
          onGenerate={generateBill}
          onPrint={printBill}
          onSavePayment={savePaymentStatus}
          onSaveRefund={saveRefundStatus}
        />
      ) : null}
      {orderAction ? (
        <OrderActionDialog
          action={orderAction}
          savingKey={savingKey}
          onChange={setOrderAction}
          onClose={() => setOrderAction(null)}
          onConfirm={confirmOrderAction}
        />
      ) : null}
    </AdminShell>
  );
}

function OrderCard({
  order,
  savingKey,
  onBill,
  onMove
}: {
  order: AdminOrder;
  savingKey: string | null;
  onBill: (order: AdminOrder) => void;
  onMove: (order: AdminOrder, status: OrderStatusCode) => void;
}) {
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
      {order.appliedOfferDiscountAmount > 0 ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          {order.appliedOfferTitle ?? "Offer applied"} saved {formatMoney(order.appliedOfferDiscountAmount)}
        </div>
      ) : null}
      <div className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
        {order.items.map((item) => (
          <div key={item.orderItemId}>
            <span>{item.quantity}x {formatAdminOrderItemName(item.menuItemName, item.variantName)}</span>
            {item.itemNote ? <span className="ml-2 font-bold text-primary">Note: {item.itemNote}</span> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatus ? (
          <Button type="button" size="sm" disabled={savingKey === order.orderId} onClick={() => onMove(order, nextStatus)}>
            Move to {nextStatus}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={() => onBill(order)}>
          <ReceiptText size={15} />
          Bill
        </Button>
        {!["Completed", "Cancelled"].includes(order.orderStatusCode) ? (
          <Button type="button" size="sm" variant="outline" disabled={savingKey === order.orderId} onClick={() => onMove(order, "Cancelled")}>
            <Ban size={15} />
            Cancel
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function BillDialog({
  state,
  savingKey,
  onChange,
  onClose,
  onGenerate,
  onPrint,
  onSavePayment,
  onSaveRefund
}: {
  state: BillDialogState;
  savingKey: string | null;
  onChange: (state: BillDialogState) => void;
  onClose: () => void;
  onGenerate: () => void;
  onPrint: () => void;
  onSavePayment: () => void;
  onSaveRefund: () => void;
}) {
  const bill = state.bill;
  const isGenerating = savingKey === `bill-${state.order.orderId}`;
  const isSavingPayment = savingKey === `payment-${state.order.orderId}`;
  const isSavingRefund = savingKey === `refund-${state.order.orderId}`;

  return (
    <Dialog>
      <DialogContent className="max-w-5xl overflow-hidden bg-surface-container-lowest p-0">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/50 bg-white px-5 py-4">
          <DialogHeader className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <ReceiptText size={20} />
              Bill for {state.order.tableName}
            </DialogTitle>
            <DialogDescription className="truncate">
              #{shortOrderCode(state.order.orderId)} - {state.order.customerName || "Guest"} - {formatAdminDate(state.order.createdAtUtc)}
            </DialogDescription>
          </DialogHeader>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close bill dialog">
            <X size={18} />
          </Button>
        </div>

        {state.isLoading ? (
          <div className="grid min-h-72 place-items-center">
            <PageLoading />
          </div>
        ) : (
          <div>
            <div className="grid max-h-[70vh] gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_24rem]">
              <section className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <BillMetric label="Subtotal" value={formatMoney(state.order.subtotalAmount)} />
                  <BillMetric label="Bill total" value={formatMoney(bill?.totalAmount ?? state.order.totalAmount)} />
                  <BillMetric label="Payment" value={bill?.paymentStatusCode ?? "Draft"} />
                  {bill?.refundStatusCode !== "NotRefunded" ? <BillMetric label="Refund" value={`${bill?.refundStatusCode} ${formatMoney(bill?.refundAmount ?? 0)}`} /> : null}
                </div>

                <div className="rounded-lg border border-outline-variant/60 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-on-surface">Order items</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">{state.order.items.length} line items</p>
                    </div>
                    <Badge variant="outline">{state.order.orderStatusCode}</Badge>
                  </div>
                  <div className="divide-y divide-outline-variant/30">
                    {state.order.items.map((item) => (
                      <div key={item.orderItemId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-on-surface">{formatAdminOrderItemName(item.menuItemName, item.variantName)}</p>
                          {item.itemNote ? <p className="mt-1 break-words text-xs font-semibold text-primary">Note: {item.itemNote}</p> : null}
                          <p className="mt-1 text-xs text-on-surface-variant">{item.quantity} x {formatMoney(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-extrabold text-on-surface">{formatMoney(item.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-outline-variant/60 bg-white p-4">
                  <p className="text-sm font-extrabold text-on-surface">Adjust bill</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Discount">
                      <Input type="number" min="0" step="0.01" value={state.discountAmount} onChange={(event) => onChange({ ...state, discountAmount: event.target.value })} />
                    </Field>
                    <Field label="Service charge">
                      <Input type="number" min="0" step="0.01" value={state.serviceChargeAmount} onChange={(event) => onChange({ ...state, serviceChargeAmount: event.target.value })} />
                    </Field>
                    <Field label="Reason">
                      <Input value={state.reason} onChange={(event) => onChange({ ...state, reason: event.target.value })} placeholder="Optional" />
                    </Field>
                  </div>
                </div>
              </section>

              <aside className="border-t border-outline-variant/50 bg-white p-5 lg:border-l lg:border-t-0">
                <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">Bill</p>
                      <p className="mt-1 text-lg font-extrabold text-primary">{bill?.billNumber ?? "Not generated"}</p>
                    </div>
                    <Badge variant={bill?.paymentStatusCode === "Paid" ? "success" : "outline"}>{bill?.paymentStatusCode ?? "Draft"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <BillLine label="Subtotal" value={formatMoney(bill?.subtotalAmount ?? state.order.subtotalAmount)} />
                    <BillLine label={bill?.appliedOfferTitle ?? state.order.appliedOfferTitle ?? "Discount"} value={formatMoney(bill?.discountAmount ?? (Number(state.discountAmount) || 0))} />
                    <BillLine label={bill ? `${bill.taxName} (${bill.taxRate}%, ${bill.taxMode.toLowerCase()})` : "Tax"} value={formatMoney(bill?.taxAmount ?? 0)} />
                    <BillLine label={bill?.serviceChargeName ?? "Service charge"} value={formatMoney(bill?.serviceChargeAmount ?? (Number(state.serviceChargeAmount) || 0))} />
                    <BillLine label="Rounding" value={formatMoney(bill?.roundingAmount ?? 0)} />
                    <BillLine label="Grand total" value={formatMoney(bill?.totalAmount ?? state.order.totalAmount)} strong />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-outline-variant/60 bg-white p-4">
                  <p className="text-sm font-extrabold text-on-surface">Payment</p>
                  <div className="mt-3 grid gap-3">
                    <Field label="Status">
                      <select value={state.paymentStatusCode} onChange={(event) => onChange({ ...state, paymentStatusCode: event.target.value as PaymentStatusCode })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                        <option value="PartiallyPaid">Partially paid</option>
                        <option value="Voided">Voided</option>
                      </select>
                    </Field>
                    <Field label="Method">
                      <select value={state.paymentMethod} onChange={(event) => onChange({ ...state, paymentMethod: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">Select method</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Online">Online</option>
                      </select>
                    </Field>
                    <Field label={state.paymentStatusCode === "Voided" ? "Void reason" : "Payment note"}>
                      <Input
                        value={state.paymentReason}
                        onChange={(event) => onChange({ ...state, paymentReason: event.target.value })}
                        placeholder={state.paymentStatusCode === "Voided" ? "Required" : "Optional"}
                      />
                    </Field>
                    <Button type="button" variant="outline" onClick={onSavePayment} disabled={!bill || isSavingPayment}>
                      {isSavingPayment ? <Loader2 size={16} className="animate-spin" /> : null}
                      Save payment
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-outline-variant/60 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-on-surface">Refund</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Record full or partial refunds with an audit reason.</p>
                    </div>
                    <Badge variant={bill?.refundStatusCode === "NotRefunded" ? "outline" : "secondary"}>
                      {bill?.refundStatusCode ?? "No bill"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Field label="Status">
                      <select
                        value={state.refundStatusCode}
                        onChange={(event) => {
                          const refundStatusCode = event.target.value as RefundStatusCode;
                          onChange({
                            ...state,
                            refundStatusCode,
                            refundAmount: refundStatusCode === "Refunded" && bill ? String(bill.totalAmount) : refundStatusCode === "NotRefunded" ? "0" : state.refundAmount
                          });
                        }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        disabled={!bill}
                      >
                        <option value="NotRefunded">Not refunded</option>
                        <option value="PartiallyRefunded">Partial refund</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </Field>
                    <Field label="Amount">
                      <Input
                        type="number"
                        min="0"
                        max={bill?.totalAmount}
                        step="0.01"
                        value={state.refundAmount}
                        onChange={(event) => onChange({ ...state, refundAmount: event.target.value })}
                        disabled={!bill || state.refundStatusCode === "Refunded" || state.refundStatusCode === "NotRefunded"}
                      />
                    </Field>
                    <Field label={state.refundStatusCode === "NotRefunded" ? "Refund reason" : "Refund reason required"}>
                      <Input
                        value={state.refundReason}
                        onChange={(event) => onChange({ ...state, refundReason: event.target.value })}
                        placeholder={state.refundStatusCode === "NotRefunded" ? "Optional" : "Required"}
                        disabled={!bill || state.refundStatusCode === "NotRefunded"}
                      />
                    </Field>
                    <Button type="button" variant="outline" onClick={onSaveRefund} disabled={!bill || isSavingRefund}>
                      {isSavingRefund ? <Loader2 size={16} className="animate-spin" /> : null}
                      Save refund
                    </Button>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/50 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="button" variant="outline" onClick={onPrint} disabled={!bill}>
                <Printer size={16} />
                Print
              </Button>
              <Button type="button" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ReceiptText size={16} />}
                {bill ? "Regenerate bill" : "Generate bill"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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

function OrderActionDialog({
  action,
  savingKey,
  onChange,
  onClose,
  onConfirm
}: {
  action: OrderActionDialogState;
  savingKey: string | null;
  onChange: (action: OrderActionDialogState) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSaving = savingKey === action.order.orderId;
  const reasonLength = action.reason.trim().length;

  return (
    <Dialog>
      <DialogContent className="max-w-lg overflow-hidden bg-white p-0">
        <div className="border-b border-outline-variant/60 bg-surface-container-low px-5 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-destructive/10 text-destructive">
                <Ban size={18} />
              </span>
              Cancel order
            </DialogTitle>
            <DialogDescription>This will close the order and void any unpaid bill linked to it.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-4 p-5">
          <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-on-surface">{action.order.tableName} - #{shortOrderCode(action.order.orderId)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{action.order.customerName || "Guest"} - {formatAdminDate(action.order.createdAtUtc)}</p>
              </div>
              <Badge variant="outline">{action.order.orderStatusCode}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">Items</p>
                <p className="mt-1 font-extrabold text-on-surface">{action.order.items.length}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">Value</p>
                <p className="mt-1 font-extrabold text-primary">{formatMoney(action.order.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label>Cancellation reason</Label>
              <span className={`text-xs font-bold ${reasonLength > 300 ? "text-destructive" : "text-on-surface-variant"}`}>{reasonLength}/300</span>
            </div>
            <textarea
              value={action.reason}
              onChange={(event) => onChange({ ...action, reason: event.target.value })}
              placeholder="Required, for example: customer requested cancellation"
              maxLength={320}
              autoFocus
              className="min-h-28 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-on-surface shadow-sm outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-on-surface-variant">This reason is saved in order history and bill audit.</p>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
            Cancelled orders cannot be moved back to active status.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/60 bg-white px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Keep order
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSaving || reasonLength === 0 || reasonLength > 300}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            Confirm cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BillMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

function BillLine({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "border-t border-outline-variant/50 pt-2 text-base font-extrabold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildBillPrintHtml(branch: BranchListItem, order: AdminOrder, bill: OrderBill): string {
  const branchAddress = [branch.addressLine1, branch.addressLine2, branch.city, branch.state, branch.postalCode].filter(Boolean).join(", ");
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>
          <strong>${escapeHtml(formatAdminOrderItemName(item.menuItemName, item.variantName))}</strong>
          ${item.itemNote ? `<span>Note: ${escapeHtml(item.itemNote)}</span>` : ""}
        </td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.unitPrice)}</td>
        <td>${formatMoney(item.lineTotal)}</td>
      </tr>`
    )
    .join("");
  const paymentText = `${bill.paymentStatusCode}${bill.paymentMethod ? ` / ${bill.paymentMethod}` : ""}`;
  const refundText = bill.refundStatusCode === "NotRefunded" ? "" : `${bill.refundStatusCode} - ${formatMoney(bill.refundAmount)}`;
  const discountLabel = bill.appliedOfferTitle ?? "Discount";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(bill.billNumber)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eeeeee; color: #161616; font-family: Arial, Helvetica, sans-serif; }
      main { width: 80mm; margin: 0 auto; background: #fff; padding: 5mm 4mm 6mm; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 20px; font-weight: 900; letter-spacing: 0.08em; line-height: 1.15; text-align: center; text-transform: uppercase; }
      .center { text-align: center; }
      .muted { color: #555; font-size: 11px; line-height: 1.35; }
      .top-mark { align-items: center; display: flex; gap: 8px; justify-content: center; margin-bottom: 8px; }
      .top-mark span { background: #161616; display: block; height: 2px; width: 26px; }
      .brand-dot { border: 2px solid #161616; border-radius: 999px; display: grid; font-size: 12px; font-weight: 900; height: 34px; place-items: center; width: 34px; }
      .subhead { margin-top: 4px; text-align: center; }
      .receipt-title { background: #161616; color: #fff; margin-top: 12px; padding: 8px 10px; text-align: center; }
      .receipt-title h2 { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; }
      .receipt-title p { color: #e8e8e8; font-size: 10px; font-weight: 700; margin-top: 2px; }
      .meta-box { border: 1px solid #161616; display: grid; gap: 5px; margin-top: 10px; padding: 8px; }
      .line { display: flex; justify-content: space-between; gap: 10px; }
      .meta-box .line { font-size: 11px; }
      .meta-box strong { text-align: right; }
      table { border-collapse: collapse; margin-top: 12px; width: 100%; }
      thead th { border-bottom: 2px solid #161616; border-top: 2px solid #161616; font-size: 10px; padding: 6px 0; text-align: left; }
      tbody td { border-bottom: 1px dashed #9a9a9a; font-size: 11px; padding: 7px 0; vertical-align: top; }
      th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
      td:first-child { padding-right: 6px; width: 44%; }
      td strong { display: block; line-height: 1.25; overflow-wrap: anywhere; }
      td span { color: #555; display: block; font-size: 9.5px; line-height: 1.25; margin-top: 2px; overflow-wrap: anywhere; }
      .totals { border-bottom: 2px solid #161616; border-top: 2px solid #161616; display: grid; gap: 6px; margin-top: 12px; padding: 9px 0; font-size: 12px; }
      .grand { align-items: center; background: #f0f0f0; font-size: 17px; font-weight: 900; margin-top: 2px; padding: 8px; }
      .payment { border: 2px solid #161616; font-size: 12px; font-weight: 900; margin-top: 10px; padding: 8px; text-align: center; text-transform: uppercase; }
      .refund { border: 1px dashed #161616; font-size: 11px; font-weight: 900; margin-top: 8px; padding: 7px; text-align: center; text-transform: uppercase; }
      .barcode { display: flex; gap: 2px; height: 36px; justify-content: center; margin-top: 12px; overflow: hidden; }
      .barcode span { background: #161616; display: block; height: 36px; }
      .barcode span:nth-child(3n) { width: 1px; }
      .barcode span:nth-child(3n+1) { width: 3px; }
      .barcode span:nth-child(3n+2) { width: 2px; }
      .footer { border-top: 1px dashed #161616; margin-top: 10px; padding-top: 8px; text-align: center; }
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body { background: #fff; }
        main { margin: 0; padding: 4mm 3mm; width: 80mm; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="top-mark"><span></span><div class="brand-dot">QR</div><span></span></div>
      <h1>${escapeHtml(branch.name)}</h1>
      <div class="subhead">
        ${branchAddress ? `<p class="muted">${escapeHtml(branchAddress)}</p>` : ""}
        ${branch.phoneNumber ? `<p class="muted">Phone: ${escapeHtml(branch.phoneNumber)}</p>` : ""}
      </div>
      <div class="receipt-title">
        <h2>TAX INVOICE</h2>
        <p>${escapeHtml(bill.billNumber)}</p>
      </div>
      <section class="meta-box">
        <div class="line"><span>Order</span><strong>#${shortOrderCode(order.orderId)}</strong></div>
        <div class="line"><span>Table</span><strong>${escapeHtml(order.tableName)}</strong></div>
        <div class="line"><span>Date</span><strong>${escapeHtml(formatAdminDate(bill.createdAtUtc))}</strong></div>
        <div class="line"><span>Customer</span><strong>${escapeHtml(order.customerName || "Guest")}</strong></div>
      </section>
      <table>
        <thead><tr><th>ITEM</th><th>QTY</th><th>RATE</th><th>AMT</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <section class="totals">
        <div class="line"><span>Subtotal</span><span>${formatMoney(bill.subtotalAmount)}</span></div>
        ${bill.discountAmount > 0 ? `<div class="line"><span>${escapeHtml(discountLabel)}</span><span>-${formatMoney(bill.discountAmount)}</span></div>` : ""}
        ${bill.taxAmount > 0 ? `<div class="line"><span>${escapeHtml(bill.taxName)} ${bill.taxRate}% ${escapeHtml(bill.taxMode)}</span><span>${formatMoney(bill.taxAmount)}</span></div>` : ""}
        ${bill.serviceChargeAmount > 0 ? `<div class="line"><span>${escapeHtml(bill.serviceChargeName)}</span><span>${formatMoney(bill.serviceChargeAmount)}</span></div>` : ""}
        ${Math.abs(bill.roundingAmount) >= 0.01 ? `<div class="line"><span>Rounding</span><span>${formatMoney(bill.roundingAmount)}</span></div>` : ""}
        <div class="line grand"><span>Total</span><span>${formatMoney(bill.totalAmount)}</span></div>
      </section>
      <div class="payment">Payment: ${escapeHtml(paymentText)}</div>
      ${refundText ? `<div class="refund">Refund: ${escapeHtml(refundText)}</div>` : ""}
      <div class="barcode">${Array.from({ length: 32 }, () => "<span></span>").join("")}</div>
      <div class="footer">
        <p class="muted">Thank you. Please visit again.</p>
        <p class="muted">Powered by Qrave</p>
      </div>
    </main>
  </body>
</html>`;
}
