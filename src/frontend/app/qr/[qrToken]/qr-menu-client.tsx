"use client";

import {
  AlertCircle,
  CheckCircle2,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  Send,
  ShoppingCart,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type ActiveView = "menu" | "cart" | "orders";

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
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [previousOrders, setPreviousOrders] = useState<PublicQrOrder[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const canOrder = menu.orderSettings.enableDirectQrOrdering;

  useEffect(() => {
    setPreviousOrders(loadStoredOrders(menu.qrToken));
  }, [menu.qrToken]);

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
      setPreviousOrders(saveStoredOrder(menu.qrToken, order));
      setActiveView("cart");
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
      <HeaderOrdersButton orderCount={previousOrders.length} onOpen={() => setActiveView("orders")} />
      <HeaderCartButton cartCount={cartCount} onOpen={() => setActiveView("cart")} />

      {activeView === "orders" ? (
        <PreviousOrdersPage orders={previousOrders} onBackToMenu={() => setActiveView("menu")} />
      ) : activeView === "cart" ? (
        <CartPage
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
          onBackToMenu={() => setActiveView("menu")}
          onNotesChange={setNotes}
          onSubmit={submitOrder}
        />
      ) : (
        <>
          <nav className="sticky top-[65px] z-10 border-b border-line bg-white/95 px-4 py-2 backdrop-blur">
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <a
                  key={category.menuCategoryId}
                  href={`#category-${category.menuCategoryId}`}
                  className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-extrabold uppercase text-on-surface-variant"
                >
                  {category.name}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex-1 pb-28">
            <div>
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

          <FloatingMenuButton onOpen={() => setIsCategoryOpen(true)} />
        </>
      )}

      {isCategoryOpen ? <CategorySheet categories={categories} onClose={() => setIsCategoryOpen(false)} /> : null}
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
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-28 bg-white">
      <div className="border-b border-line px-4 py-4">
        <h2 className="text-center text-[15px] font-extrabold uppercase tracking-normal text-ink">{category.name}</h2>
      </div>

      <div className="divide-y divide-line">
        {items.map((item) => {
          const quantity = cart[item.menuItemId]?.quantity ?? 0;

          return (
            <article key={item.menuItemId} className="grid grid-cols-[76px_1fr_auto] gap-3 px-4 py-3">
              <ItemImage name={item.name} />

              <div className="min-w-0 py-0.5">
                <h3 className="break-words text-[13px] font-extrabold uppercase leading-5 text-ink">{item.name}</h3>
                {item.description ? (
                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-on-surface-variant">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-1 whitespace-nowrap text-[12px] font-extrabold text-gold">{formatPrice(item.price)}</p>
              </div>

              {canOrder ? (
                quantity > 0 ? (
                  <div className="self-center flex h-9 items-center overflow-hidden rounded-full border border-line">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center text-primary"
                      onClick={() => onDecrement(item.menuItemId)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="grid h-9 w-7 place-items-center border-x border-line text-xs font-extrabold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center text-primary"
                      onClick={() => onAdd(item, category.name)}
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="self-center grid h-9 w-9 place-items-center rounded-full border border-line text-primary"
                    onClick={() => onAdd(item, category.name)}
                    aria-label={`Add ${item.name}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                )
              ) : (
                <span aria-hidden="true" />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CartPage({
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
  onBackToMenu,
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
  onBackToMenu: () => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (submitState.kind === "success") {
    return <OrderPlacedView order={submitState.order} onBackToMenu={onBackToMenu} />;
  }

  return (
    <section className="flex-1 bg-surface-bright px-4 py-4 pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Cart</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {cartCount} selected item{cartCount === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink"
          onClick={onBackToMenu}
        >
          Menu
        </button>
      </div>

      {submitState.kind === "error" ? (
        <div className="mb-4 flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">{submitState.message}</p>
        </div>
      ) : null}

      {cartLines.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            {cartLines.map((line) => (
              <div key={line.item.menuItemId} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-line bg-white p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-ink">{line.item.name}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{line.categoryName}</p>
                  <p className="mt-2 text-sm font-extrabold text-gold">{formatPrice(line.item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink">x{line.quantity}</span>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border border-line text-on-surface-variant"
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

          <div className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between text-sm text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-bold text-ink">{formatPrice(cartTotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-base font-extrabold text-ink">Total amount</span>
              <span className="text-xl font-extrabold text-primary">{formatPrice(cartTotal)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Name{orderSettings.requireCustomerName ? " *" : ""}
              </span>
              <input
                className="mt-1 h-11 w-full rounded border border-line bg-white px-3 text-sm outline-none focus:border-primary"
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
                className="mt-1 h-11 w-full rounded border border-line bg-white px-3 text-sm outline-none focus:border-primary"
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
              className="mt-1 min-h-20 w-full resize-none rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              maxLength={500}
            />
          </label>

          <button
            type="button"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-extrabold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartCount === 0 || submitState.kind === "submitting"}
            onClick={onSubmit}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitState.kind === "submitting" ? "Sending order" : "Place order"}
          </button>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-line bg-white p-5 text-center">
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">Your cart is empty</p>
            <p className="mt-1 text-sm text-on-surface-variant">Add menu items to see total amount and place an order.</p>
            <button
              type="button"
              className="mt-4 rounded bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              onClick={onBackToMenu}
            >
              Back to menu
            </button>
          </div>
        )}
    </section>
  );
}

function OrderPlacedView({ order, onBackToMenu }: { order: PublicQrOrder; onBackToMenu: () => void }) {
  return (
    <section className="flex-1 bg-surface-bright px-4 py-5 pb-8">
      <div className="rounded-lg border border-line bg-white p-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-ink">Order placed</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">Staff received your order.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded border border-line bg-surface-bright p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
            <p className="mt-1 text-lg font-extrabold text-ink">#{shortOrderCode(order.orderId)}</p>
          </div>
          <div className="rounded border border-line bg-surface-bright p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Status</p>
            <p className="mt-1 text-lg font-extrabold text-primary">{order.orderStatusCode}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-sm font-extrabold uppercase text-ink">Items</h3>
          <p className="text-sm font-bold text-on-surface-variant">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </div>

        <div className="divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="grid grid-cols-[1fr_auto] gap-3 py-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-ink">{item.menuItemName}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {item.quantity} x {formatPrice(item.unitPrice)}
                </p>
              </div>
              <p className="text-sm font-extrabold text-ink">{formatPrice(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="text-base font-extrabold text-ink">Total amount</span>
          <span className="text-xl font-extrabold text-primary">{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 h-12 w-full rounded bg-primary px-4 text-sm font-extrabold text-on-primary"
        onClick={onBackToMenu}
      >
        Back to menu
      </button>
    </section>
  );
}

function HeaderCartButton({ cartCount, onOpen }: { cartCount: number; onOpen: () => void }) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 pointer-events-none">
      <div className="mx-auto flex h-[65px] w-full max-w-md items-center justify-end px-4">
        <button
          type="button"
          className="pointer-events-auto relative grid h-10 w-10 place-items-center text-ink"
          onClick={onOpen}
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {cartCount > 0 ? (
            <span className="absolute right-0 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-secondary-container px-1 text-[10px] font-extrabold leading-none text-on-secondary-container">
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

function HeaderOrdersButton({ orderCount, onOpen }: { orderCount: number; onOpen: () => void }) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 pointer-events-none">
      <div className="mx-auto flex h-[65px] w-full max-w-md items-center justify-start px-4">
        <button
          type="button"
          className="pointer-events-auto relative grid h-10 w-10 place-items-center text-ink"
          onClick={onOpen}
          aria-label="Open previous orders"
        >
          <ReceiptText className="h-5 w-5" aria-hidden="true" />
          {orderCount > 0 ? (
            <span className="absolute right-0 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-secondary-container px-1 text-[10px] font-extrabold leading-none text-on-secondary-container">
              {orderCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

function PreviousOrdersPage({
  orders,
  onBackToMenu
}: {
  orders: PublicQrOrder[];
  onBackToMenu: () => void;
}) {
  return (
    <section className="flex-1 bg-surface-bright px-4 py-4 pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Previous orders</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {orders.length} order{orders.length === 1 ? "" : "s"} on this device
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink"
          onClick={onBackToMenu}
        >
          Menu
        </button>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.orderId} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
                  <h3 className="mt-1 text-lg font-extrabold text-ink">#{shortOrderCode(order.orderId)}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">{formatOrderDate(order.createdAtUtc)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Status</p>
                  <p className="mt-1 text-sm font-extrabold text-primary">{order.orderStatusCode}</p>
                  <p className="mt-2 text-base font-extrabold text-ink">{formatPrice(order.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-3 divide-y divide-line border-t border-line">
                {order.items.map((item) => (
                  <div key={item.orderItemId} className="grid grid-cols-[1fr_auto] gap-3 py-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-ink">{item.menuItemName}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {item.quantity} x {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-ink">{formatPrice(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-line bg-white p-5 text-center">
          <ReceiptText className="h-8 w-8 text-gold" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ink">No previous orders yet</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Orders placed from this browser will appear here.
          </p>
          <button
            type="button"
            className="mt-4 rounded bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            onClick={onBackToMenu}
          >
            Back to menu
          </button>
        </div>
      )}
    </section>
  );
}

function FloatingMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto flex w-full max-w-md justify-end px-4 pb-5">
        <button
          type="button"
          className="pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-modal"
          onClick={onOpen}
          aria-label="Open categories"
        >
          <Menu className="h-7 w-7" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CategorySheet({
  categories,
  onClose
}: {
  categories: PublicQrMenuCategory[];
  onClose: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <div className="rounded-xl border border-line bg-white p-3 shadow-modal">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm font-extrabold uppercase text-ink">Categories</p>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-on-surface-variant"
              onClick={onClose}
              aria-label="Close categories"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto py-2">
            {categories.map((category) => (
              <a
                key={category.menuCategoryId}
                href={`#category-${category.menuCategoryId}`}
                className="flex min-h-12 items-center justify-between border-b border-line px-1 text-sm font-bold text-ink last:border-b-0"
                onClick={onClose}
              >
                <span>{category.name}</span>
                <span className="text-xs font-semibold text-on-surface-variant">{category.items.length}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ItemImage({ name }: { name: string }) {
  return (
    <div className="relative h-[64px] w-[76px] overflow-hidden rounded bg-surface-container-low">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,201,40,0.24),transparent_35%),linear-gradient(135deg,#f8fafb,#e8edf0)]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-primary shadow-sm">
          <Utensils className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <span className="sr-only">{name}</span>
    </div>
  );
}

function valueOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shortOrderCode(orderId: string): string {
  return orderId.replaceAll("-", "").slice(0, 8).toUpperCase();
}

function orderStorageKey(qrToken: string): string {
  return `qrapp.public.orders.${qrToken}`;
}

function loadStoredOrders(qrToken: string): PublicQrOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(orderStorageKey(qrToken));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPublicQrOrder).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveStoredOrder(qrToken: string, order: PublicQrOrder): PublicQrOrder[] {
  if (typeof window === "undefined") {
    return [order];
  }

  const existing = loadStoredOrders(qrToken).filter((stored) => stored.orderId !== order.orderId);
  const next = [order, ...existing].slice(0, 20);
  window.localStorage.setItem(orderStorageKey(qrToken), JSON.stringify(next));
  return next;
}

function isPublicQrOrder(value: unknown): value is PublicQrOrder {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PublicQrOrder>;
  return (
    typeof candidate.orderId === "string" &&
    typeof candidate.orderStatusCode === "string" &&
    typeof candidate.totalAmount === "number" &&
    typeof candidate.createdAtUtc === "string" &&
    Array.isArray(candidate.items)
  );
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}
