"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { ClipboardList, Loader2, Printer, ReceiptText, RefreshCw, Store, Users, X } from "lucide-react";
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
  updateWaiterCallStatus,
  type AdminOrder,
  type BranchBillingSettings,
  type OrderBill,
  type OrderStatusCode,
  type PaymentStatusCode,
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
  isLoading: boolean;
};

export default function AdminOrdersPage() {
  const workspace = useAdminWorkspace();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [billingSettings, setBillingSettings] = useState<BranchBillingSettings | null>(null);
  const [billDialog, setBillDialog] = useState<BillDialogState | null>(null);
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

  async function openBill(order: AdminOrder) {
    if (!workspace.selectedBranch) {
      return;
    }

    const defaultServiceCharge = billingSettings?.serviceChargeEnabled ? roundMoney(order.subtotalAmount * billingSettings.serviceChargeRate / 100) : 0;
    setBillDialog({
      order,
      bill: null,
      discountAmount: "0",
      serviceChargeAmount: defaultServiceCharge.toFixed(2),
      paymentStatusCode: "Unpaid",
      paymentMethod: "",
      reason: "",
      isLoading: true
    });

    try {
      const bill = await getOrderBill(workspace.selectedBranch.branchId, order.orderId);
      setBillDialog({
        order,
        bill,
        discountAmount: String(bill?.discountAmount ?? 0),
        serviceChargeAmount: String(bill?.serviceChargeAmount ?? defaultServiceCharge),
        paymentStatusCode: bill?.paymentStatusCode ?? "Unpaid",
        paymentMethod: bill?.paymentMethod ?? "",
        reason: "",
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
      setBillDialog({ ...billDialog, bill, paymentStatusCode: bill.paymentStatusCode, paymentMethod: bill.paymentMethod ?? "", isLoading: false });
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

    setSavingKey(`payment-${billDialog.order.orderId}`);
    try {
      const bill = await updateOrderBillPaymentStatus(workspace.selectedBranch.branchId, billDialog.order.orderId, {
        paymentStatusCode: billDialog.paymentStatusCode,
        paymentMethod: billDialog.paymentMethod.trim() || null,
        reason: billDialog.reason.trim() || null
      });
      setBillDialog({ ...billDialog, bill, paymentStatusCode: bill.paymentStatusCode, paymentMethod: bill.paymentMethod ?? "", reason: "" });
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

    const printWindow = window.open("", "_blank", "width=520,height=720");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(buildBillPrintHtml(workspace.selectedBranch.name, billDialog.order, billDialog.bill));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
                    activeOrders.map((order) => <OrderCard key={order.orderId} order={order} savingKey={savingKey} onBill={openBill} onMove={moveOrder} />)
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
  onSavePayment
}: {
  state: BillDialogState;
  savingKey: string | null;
  onChange: (state: BillDialogState) => void;
  onClose: () => void;
  onGenerate: () => void;
  onPrint: () => void;
  onSavePayment: () => void;
}) {
  const bill = state.bill;
  const isGenerating = savingKey === `bill-${state.order.orderId}`;
  const isSavingPayment = savingKey === `payment-${state.order.orderId}`;

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
                    <BillLine label="Discount" value={formatMoney(bill?.discountAmount ?? (Number(state.discountAmount) || 0))} />
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
                      <Input value={state.paymentMethod} onChange={(event) => onChange({ ...state, paymentMethod: event.target.value })} placeholder="Cash, UPI, card" />
                    </Field>
                    <Button type="button" variant="outline" onClick={onSavePayment} disabled={!bill || isSavingPayment}>
                      {isSavingPayment ? <Loader2 size={16} className="animate-spin" /> : null}
                      Save payment
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

function buildBillPrintHtml(branchName: string, order: AdminOrder, bill: OrderBill): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(formatAdminOrderItemName(item.menuItemName, item.variantName))}</td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.unitPrice)}</td>
        <td>${formatMoney(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(bill.billNumber)}</title>
    <style>
      body { margin: 0; color: #151515; font-family: Arial, sans-serif; }
      main { margin: 0 auto; max-width: 520px; padding: 24px; }
      h1, p { margin: 0; }
      .muted { color: #555; font-size: 12px; }
      table { border-collapse: collapse; margin-top: 18px; width: 100%; }
      th, td { border-bottom: 1px solid #ddd; padding: 8px 0; text-align: left; font-size: 13px; }
      th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
      .totals { margin-top: 18px; display: grid; gap: 8px; font-size: 14px; }
      .line { display: flex; justify-content: space-between; gap: 16px; }
      .grand { border-top: 2px solid #151515; padding-top: 10px; font-size: 18px; font-weight: 800; }
      @media print { @page { margin: 12mm; } main { padding: 0; } }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(branchName)}</h1>
      <p class="muted">Bill ${escapeHtml(bill.billNumber)} - ${escapeHtml(order.tableName)} - ${formatAdminDate(bill.createdAtUtc)}</p>
      <p class="muted">Customer: ${escapeHtml(order.customerName || "Guest")}</p>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <section class="totals">
        <div class="line"><span>Subtotal</span><span>${formatMoney(bill.subtotalAmount)}</span></div>
        <div class="line"><span>Discount</span><span>${formatMoney(bill.discountAmount)}</span></div>
        <div class="line"><span>${escapeHtml(bill.taxName)} (${bill.taxRate}%, ${escapeHtml(bill.taxMode)})</span><span>${formatMoney(bill.taxAmount)}</span></div>
        <div class="line"><span>${escapeHtml(bill.serviceChargeName)}</span><span>${formatMoney(bill.serviceChargeAmount)}</span></div>
        <div class="line"><span>Rounding</span><span>${formatMoney(bill.roundingAmount)}</span></div>
        <div class="line grand"><span>Total</span><span>${formatMoney(bill.totalAmount)}</span></div>
        <div class="line"><span>Payment</span><span>${escapeHtml(bill.paymentStatusCode)}${bill.paymentMethod ? ` - ${escapeHtml(bill.paymentMethod)}` : ""}</span></div>
      </section>
    </main>
  </body>
</html>`;
}
