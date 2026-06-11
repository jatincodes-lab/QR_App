"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ReceiptText, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getPublicQrOrder, type PublicQrMenu, type PublicQrOrder } from "../../../../../lib/api";

const StatusSteps = ["Placed", "Accepted", "Preparing", "Ready", "Served"] as const;

export function OrderTrackingClient({
  initialMenu,
  initialOrder,
  orderId,
  qrToken
}: {
  initialMenu: PublicQrMenu;
  initialOrder: PublicQrOrder;
  orderId: string;
  qrToken: string;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStepIndex = useMemo(() => StatusSteps.findIndex((status) => status === order.orderStatusCode), [order.orderStatusCode]);
  const isCancelled = order.orderStatusCode === "Cancelled";
  const isCompleted = order.orderStatusCode === "Completed";

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void refreshOrder();
      }
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [orderId, qrToken]);

  async function refreshOrder() {
    setIsRefreshing(true);
    setError(null);

    try {
      setOrder(await getPublicQrOrder(qrToken, orderId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not refresh order status.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/qr/${encodeURIComponent(qrToken)}`} className="inline-flex items-center gap-2 text-sm font-black text-[#006d36]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Menu
          </Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">Order tracking</p>
          <h1 className="mt-1 truncate text-2xl font-black leading-8 text-[#001c11]">#{shortOrderCode(order.orderId)}</h1>
          <p className="mt-1 text-sm font-semibold text-[#5a625e]">
            {initialMenu.branchName} - {initialMenu.tableName}
          </p>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d9e4df] bg-white text-[#001c11] shadow-sm disabled:opacity-60"
          disabled={isRefreshing}
          onClick={() => void refreshOrder()}
          aria-label="Refresh order status"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#d9e4df] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Current status</p>
            <h2 className="mt-1 text-3xl font-black text-[#001c11]">{order.orderStatusCode}</h2>
          </div>
          <div className={`grid h-14 w-14 place-items-center rounded-full ${isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isCancelled ? <AlertCircle className="h-8 w-8" aria-hidden="true" /> : <CheckCircle2 className="h-8 w-8" aria-hidden="true" />}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {StatusSteps.map((status, index) => {
            const isDone = currentStepIndex >= index || isCompleted;
            const isCurrent = order.orderStatusCode === status;

            return (
              <div key={status} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${isDone ? "bg-[#006d36] text-white" : "bg-[#eef3f0] text-[#5a625e]"}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Clock3 className="h-5 w-5" aria-hidden="true" />}
                </div>
                <div className={`rounded-xl border p-3 ${isCurrent ? "border-[#006d36] bg-[#f1fbf5]" : "border-[#d9e4df] bg-[#f8f9fa]"}`}>
                  <p className="text-sm font-black text-[#001c11]">{status}</p>
                  <p className="mt-1 text-xs font-semibold text-[#5a625e]">{statusHelp(status)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {isCancelled ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">This order was cancelled by staff.</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6eeea] pb-3">
          <h3 className="text-sm font-black uppercase text-[#001c11]">Items</h3>
          <p className="text-sm font-bold text-on-surface-variant">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </div>

        <div className="divide-y divide-[#e6eeea]">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="grid grid-cols-[2rem_1fr_auto] gap-3 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f8f9fa] text-[#006d36]">
                <Utensils className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-[#001c11]">{formatOrderItemName(item.menuItemName, item.variantName)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {item.quantity} x {formatPrice(item.unitPrice)}
                </p>
                {item.itemNote ? <p className="mt-1 rounded-lg bg-[#f8f9fa] px-2 py-1 text-xs font-semibold text-[#5a625e]">{item.itemNote}</p> : null}
              </div>
              <p className="text-sm font-black text-[#001c11]">{formatPrice(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-[#e6eeea] pt-3">
          <span className="text-base font-black text-[#001c11]">Total amount</span>
          <span className="text-xl font-black text-[#006d36]">{formatPrice(order.totalAmount)}</span>
        </div>
        {order.appliedOfferDiscountAmount > 0 ? (
          <div className="mt-3 rounded-xl border border-[#bfe6cf] bg-[#f1fbf5] px-3 py-2 text-sm font-bold text-[#006d36]">
            {order.appliedOfferTitle ?? "Offer applied"} saved {formatPrice(order.appliedOfferDiscountAmount)}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <ReceiptText className="h-5 w-5 text-[#006d36]" aria-hidden="true" />
        <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">Placed at</p>
        <p className="mt-1 text-sm font-black text-[#001c11]">{formatOrderDate(order.createdAtUtc)}</p>
      </div>
    </section>
  );
}

function statusHelp(status: (typeof StatusSteps)[number]): string {
  switch (status) {
    case "Placed":
      return "Your order has reached the restaurant.";
    case "Accepted":
      return "Staff accepted your order.";
    case "Preparing":
      return "Kitchen is preparing your items.";
    case "Ready":
      return "Your order is ready.";
    case "Served":
      return "Staff marked this order as served.";
  }
}

function formatOrderItemName(name: string, variantName: string | null): string {
  return variantName ? `${name} - ${variantName}` : name;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
