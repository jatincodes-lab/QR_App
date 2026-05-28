"use client";

import { AlertCircle, CheckCircle2, Minus, Plus, ReceiptText, Send, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ApiError,
  createPublicQrOrder,
  type CreatePublicQrOrderInput,
  type PublicQrMenu,
  type PublicQrMenuCategory,
  type PublicQrMenuItem,
  type PublicQrOrder
} from "../../../lib/api";

type CartLine = {
  item: PublicQrMenuItem;
  categoryName: string;
  quantity: number;
};

type SubmitState =
  | {
      kind: "idle";
    }
  | {
      kind: "submitting";
    }
  | {
      kind: "success";
      order: PublicQrOrder;
    }
  | {
      kind: "error";
      message: string;
    };

export function QrMenuClient({ menu }: { menu: PublicQrMenu }) {
  const categories = useMemo(
    () => [...menu.categories].sort((left, right) => left.displayOrder - right.displayOrder),
    [menu.categories]
  );
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [notes, setNotes] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const canOrder = menu.orderSettings.enableDirectQrOrdering;

  function addItem(item: PublicQrMenuItem, categoryName: string) {
    if (!canOrder) {
      return;
    }

    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[item.menuItemId];
      return {
        ...current,
        [item.menuItemId]: {
          item,
          categoryName,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  }

  function decrementItem(menuItemId: string) {
    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[menuItemId];
      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        const next = { ...current };
        delete next[menuItemId];
        return next;
      }

      return {
        ...current,
        [menuItemId]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  }

  async function submitOrder() {
    if (!canOrder || cartLines.length === 0 || submitState.kind === "submitting") {
      return;
    }

    if (menu.orderSettings.requireCustomerName && customerName.trim().length === 0) {
      setSubmitState({ kind: "error", message: "Please enter your name." });
      return;
    }

    if (menu.orderSettings.requireCustomerWhatsApp && customerWhatsApp.trim().length === 0) {
      setSubmitState({ kind: "error", message: "Please enter your WhatsApp number." });
      return;
    }

    const input: CreatePublicQrOrderInput = {
      customerName: valueOrNull(customerName),
      customerWhatsApp: valueOrNull(customerWhatsApp),
      notes: valueOrNull(notes),
      items: cartLines.map((line) => ({
        menuItemId: line.item.menuItemId,
        quantity: line.quantity
      }))
    };

    setSubmitState({ kind: "submitting" });

    try {
      const order = await createPublicQrOrder(menu.qrToken, input);
      setCart({});
      setNotes("");
      setSubmitState({ kind: "success", order });
    } catch (caught) {
      setSubmitState({
        kind: "error",
        message: caught instanceof ApiError ? caught.message : "Order could not be submitted. Please try again."
      });
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <a
              key={category.menuCategoryId}
              href={`#category-${category.menuCategoryId}`}
              className="shrink-0 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-on-surface-variant shadow-soft-saas"
            >
              {category.name}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex-1 px-4 py-4 pb-40 sm:px-6">
        <div className="space-y-5">
          {categories.map((category) => (
            <MenuCategorySection
              key={category.menuCategoryId}
              canOrder={canOrder}
              cart={cart}
              category={category}
              onAdd={addItem}
              onDecrement={decrementItem}
            />
          ))}
        </div>
      </div>

      {canOrder ? (
        <OrderDock
          cartCount={cartCount}
          cartLines={cartLines}
          cartTotal={cartTotal}
          customerName={customerName}
          customerWhatsApp={customerWhatsApp}
          notes={notes}
          orderSettings={menu.orderSettings}
          submitState={submitState}
          onCustomerNameChange={setCustomerName}
          onCustomerWhatsAppChange={setCustomerWhatsApp}
          onDecrement={decrementItem}
          onNotesChange={setNotes}
          onSubmit={submitOrder}
        />
      ) : null}
    </>
  );
}

function MenuCategorySection({
  canOrder,
  cart,
  category,
  onAdd,
  onDecrement
}: {
  canOrder: boolean;
  cart: Record<string, CartLine>;
  category: PublicQrMenuCategory;
  onAdd: (item: PublicQrMenuItem, categoryName: string) => void;
  onDecrement: (menuItemId: string) => void;
}) {
  const items = [...category.items].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-20 border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-lg font-bold leading-7">{category.name}</h2>
      </div>

      <div className="divide-y divide-line">
        {items.map((item) => {
          const quantity = cart[item.menuItemId]?.quantity ?? 0;

          return (
            <article key={item.menuItemId} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold leading-6">{item.name}</h3>
                {item.description ? (
                  <p className="mt-1 break-words text-sm leading-6 text-on-surface-variant">{item.description}</p>
                ) : null}
                <p className="mt-2 whitespace-nowrap text-sm font-bold text-primary">{formatPrice(item.price)}</p>
              </div>

              {canOrder ? (
                quantity > 0 ? (
                  <div className="flex h-10 items-center overflow-hidden rounded border border-line">
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center text-primary"
                      onClick={() => onDecrement(item.menuItemId)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="grid h-10 w-9 place-items-center border-x border-line text-sm font-bold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center text-primary"
                      onClick={() => onAdd(item, category.name)}
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded border border-primary text-primary"
                    onClick={() => onAdd(item, category.name)}
                    aria-label={`Add ${item.name}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )
              ) : (
                <p className="whitespace-nowrap text-sm font-bold text-primary">{formatPrice(item.price)}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OrderDock({
  cartCount,
  cartLines,
  cartTotal,
  customerName,
  customerWhatsApp,
  notes,
  orderSettings,
  submitState,
  onCustomerNameChange,
  onCustomerWhatsAppChange,
  onDecrement,
  onNotesChange,
  onSubmit
}: {
  cartCount: number;
  cartLines: CartLine[];
  cartTotal: number;
  customerName: string;
  customerWhatsApp: string;
  notes: string;
  orderSettings: PublicQrMenu["orderSettings"];
  submitState: SubmitState;
  onCustomerNameChange: (value: string) => void;
  onCustomerWhatsAppChange: (value: string) => void;
  onDecrement: (menuItemId: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white shadow-[0_-12px_30px_rgba(20,30,55,0.12)]">
      <div className="mx-auto max-h-[72vh] w-full max-w-3xl overflow-y-auto px-4 py-4 sm:px-6">
        {submitState.kind === "success" ? (
          <div className="mb-3 flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">Order sent</p>
              <p className="mt-1 text-sm">Order total: {formatPrice(submitState.order.totalAmount)}</p>
            </div>
          </div>
        ) : null}

        {submitState.kind === "error" ? (
          <div className="mb-3 flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-red-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">{submitState.message}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary text-on-primary">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{cartCount} item{cartCount === 1 ? "" : "s"}</p>
              <p className="text-sm text-on-surface-variant">{formatPrice(cartTotal)}</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded bg-primary px-4 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartCount === 0 || submitState.kind === "submitting"}
            onClick={onSubmit}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitState.kind === "submitting" ? "Sending" : "Place order"}
          </button>
        </div>

        {cartLines.length > 0 ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              {cartLines.map((line) => (
                <div key={line.item.menuItemId} className="grid grid-cols-[1fr_auto] gap-3 rounded border border-line p-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold">{line.item.name}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{line.categoryName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      {line.quantity} x {formatPrice(line.item.price)}
                    </span>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded border border-line text-on-surface-variant"
                      onClick={() => onDecrement(line.item.menuItemId)}
                      aria-label={`Remove one ${line.item.name}`}
                    >
                      {line.quantity === 1 ? (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  Name{orderSettings.requireCustomerName ? " *" : ""}
                </span>
                <input
                  className="mt-1 h-11 w-full rounded border border-line px-3 text-sm outline-none focus:border-primary"
                  value={customerName}
                  onChange={(event) => onCustomerNameChange(event.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  WhatsApp{orderSettings.requireCustomerWhatsApp ? " *" : ""}
                </span>
                <input
                  className="mt-1 h-11 w-full rounded border border-line px-3 text-sm outline-none focus:border-primary"
                  value={customerWhatsApp}
                  onChange={(event) => onCustomerWhatsAppChange(event.target.value)}
                  inputMode="tel"
                  maxLength={32}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">Notes</span>
              <textarea
                className="mt-1 min-h-20 w-full resize-none rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                maxLength={500}
              />
            </label>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded border border-line bg-surface p-3 text-sm text-on-surface-variant">
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
            Add menu items to send an order to the restaurant.
          </div>
        )}
      </div>
    </aside>
  );
}

function valueOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}
