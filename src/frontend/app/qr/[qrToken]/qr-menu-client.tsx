"use client";

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
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
  createWaiterCall,
  createPublicQrOrder,
  getPublicQrMenu,
  getPublicQrOrder,
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

type WaiterCallState =
  | {
      kind: "idle";
    }
  | {
      kind: "submitting";
    }
  | {
      kind: "success";
    }
  | {
      kind: "error";
      message: string;
    };

export function QrMenuClient({ menu }: { menu: PublicQrMenu }) {
  const [currentMenu, setCurrentMenu] = useState(menu);
  const [search, setSearch] = useState("");
  const categories = useMemo(
    () => filterCategories(currentMenu.categories, search),
    [currentMenu.categories, search]
  );
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");
  const [notes, setNotes] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [previousOrders, setPreviousOrders] = useState<PublicQrOrder[]>([]);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [ordersRefreshError, setOrdersRefreshError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [waiterCallNote, setWaiterCallNote] = useState("");
  const [waiterCallState, setWaiterCallState] = useState<WaiterCallState>({ kind: "idle" });
  const [flyingItem, setFlyingItem] = useState<{ key: number; name: string } | null>(null);
  const [recentItem, setRecentItem] = useState<PublicQrMenuItem | null>(null);
  const [barPulseKey, setBarPulseKey] = useState(0);

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const canOrder = currentMenu.orderSettings.enableDirectQrOrdering;
  const canCallWaiter = currentMenu.orderSettings.waiterCallEnabled;
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);

  useEffect(() => {
    setPreviousOrders(loadStoredOrders(currentMenu.qrToken));
  }, [currentMenu.qrToken]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.hidden) {
        return;
      }

      try {
        const refreshed = await getPublicQrMenu(currentMenu.qrToken);
        setCurrentMenu(refreshed);
      } catch {
        // Keep the last known menu visible if the API is temporarily unavailable.
      }
    }, 6_000);

    return () => window.clearInterval(timer);
  }, [currentMenu.qrToken]);

  useEffect(() => {
    if (previousOrders.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void refreshPreviousOrders({ silent: true });
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [currentMenu.qrToken, previousOrders.length]);

  function addItem(item: PublicQrMenuItem, categoryName: string) {
    if (!canOrder) {
      return;
    }

    setSubmitState({ kind: "idle" });
    setFlyingItem({ key: Date.now(), name: item.name });
    setRecentItem(item);
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
    window.setTimeout(() => {
      setFlyingItem(null);
      setBarPulseKey((current) => current + 1);
    }, 1120);
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
        setRecentItem((currentRecent) => {
          if (currentRecent?.menuItemId !== menuItemId) {
            return currentRecent;
          }

          const remaining = Object.values(next);
          return remaining[remaining.length - 1]?.item ?? null;
        });
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
      const order = await createPublicQrOrder(currentMenu.qrToken, input);
      setCart({});
      setNotes("");
      setPreviousOrders(saveStoredOrder(currentMenu.qrToken, order));
      setActiveView("cart");
      setSubmitState({ kind: "success", order });
    } catch (caught) {
      setSubmitState({
        kind: "error",
        message: caught instanceof ApiError ? caught.message : "Order could not be submitted. Please try again."
      });
    }
  }

  function returnToMenu() {
    if (submitState.kind === "success") {
      setSubmitState({ kind: "idle" });
    }

    setActiveView("menu");
  }

  async function openPreviousOrders() {
    setActiveView("orders");
    await refreshPreviousOrders();
  }

  async function refreshPreviousOrders(options: { silent?: boolean } = {}) {
    const storedOrders = loadStoredOrders(currentMenu.qrToken);
    if (storedOrders.length === 0) {
      setPreviousOrders([]);
      setOrdersRefreshError(null);
      return;
    }

    if (!options.silent) {
      setIsRefreshingOrders(true);
    }

    try {
      let hasRefreshFailure = false;
      const refreshed = await Promise.all(
        storedOrders.map(async (order) => {
          try {
            return await getPublicQrOrder(currentMenu.qrToken, order.orderId);
          } catch {
            hasRefreshFailure = true;
            return order;
          }
        })
      );

      setPreviousOrders(saveStoredOrders(currentMenu.qrToken, refreshed));
      setOrdersRefreshError(hasRefreshFailure ? "Some order statuses could not be refreshed. Check that the backend database is up to date." : null);
    } finally {
      if (!options.silent) {
        setIsRefreshingOrders(false);
      }
    }
  }

  async function submitWaiterCall() {
    if (!canCallWaiter || waiterCallState.kind === "submitting") {
      return;
    }

    setWaiterCallState({ kind: "submitting" });

    try {
      await createWaiterCall(currentMenu.qrToken, {
        customerName: valueOrNull(customerName),
        note: valueOrNull(waiterCallNote)
      });
      setWaiterCallNote("");
      setWaiterCallState({ kind: "success" });
    } catch (caught) {
      setWaiterCallState({
        kind: "error",
        message: caught instanceof ApiError ? caught.message : "Waiter could not be called. Please try again."
      });
    }
  }

  return (
    <>
      <HeaderOrdersButton orderCount={previousOrders.length} onOpen={() => void openPreviousOrders()} />
      <HeaderCartButton cartCount={cartCount} onOpen={() => setActiveView("cart")} />

      {activeView === "orders" ? (
        <PreviousOrdersPage
          isRefreshing={isRefreshingOrders}
          orders={previousOrders}
          refreshError={ordersRefreshError}
          onBackToMenu={() => setActiveView("menu")}
          onRefresh={() => void refreshPreviousOrders()}
        />
      ) : activeView === "cart" ? (
        <CartPage
          cartCount={cartCount}
          cartLines={cartLines}
          cartTotal={cartTotal}
          customerName={customerName}
          customerWhatsApp={customerWhatsApp}
          notes={notes}
          orderSettings={currentMenu.orderSettings}
          submitState={submitState}
          onCustomerNameChange={setCustomerName}
          onCustomerWhatsAppChange={setCustomerWhatsApp}
          onDecrement={decrementItem}
          onBackToMenu={returnToMenu}
          onNotesChange={setNotes}
          onSubmit={submitOrder}
        />
      ) : (
        <>
          {flyingItem ? <FlyingCartItem key={flyingItem.key} name={flyingItem.name} /> : null}
          {!canOrder ? <OrderingUnavailableNotice /> : null}
          {canCallWaiter ? (
            <WaiterCallAction
              note={waiterCallNote}
              state={waiterCallState}
              onNoteChange={(value) => {
                setWaiterCallNote(value);
                if (waiterCallState.kind !== "submitting") {
                  setWaiterCallState({ kind: "idle" });
                }
              }}
              onSubmit={() => void submitWaiterCall()}
            />
          ) : null}

          <MenuHero menu={currentMenu} categories={categories} itemCount={itemCount} search={search} onSearchChange={setSearch} />

          <div className="flex-1 space-y-5 bg-[#f5faf8] px-4 pb-28">
            {itemCount > 0 ? (
              categories.map((category) => (
                <MenuCategorySection
                  key={category.menuCategoryId}
                  canOrder={canOrder}
                  cart={cart}
                  category={category}
                  onAdd={addItem}
                  onDecrement={decrementItem}
                />
              ))
            ) : (
              <MenuEmptyState canOrder={canOrder} search={search} />
            )}
          </div>

          {canOrder && cartCount > 0 ? (
            <CheckoutBar
              cartCount={cartCount}
              cartTotal={cartTotal}
              pulseKey={barPulseKey}
              recentItem={recentItem ?? cartLines[cartLines.length - 1]?.item ?? null}
              onOpen={() => setActiveView("cart")}
            />
          ) : null}

          <FloatingMenuButton hasCheckoutBar={canOrder && cartCount > 0} onOpen={() => setIsCategoryOpen(true)} />
        </>
      )}

      {isCategoryOpen ? <CategorySheet categories={categories} onClose={() => setIsCategoryOpen(false)} /> : null}
    </>
  );
}

function OrderingUnavailableNotice() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-5 text-amber-950">
      Ordering is paused for this table. You can still browse the menu.
    </div>
  );
}

function WaiterCallAction({
  note,
  state,
  onNoteChange,
  onSubmit
}: {
  note: string;
  state: WaiterCallState;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="border-b border-line bg-white px-4 py-3">
      <div className="rounded-lg border border-line bg-surface-bright p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">Need staff?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                maxLength={500}
                placeholder="Optional note"
                className="h-10 min-w-0 rounded border border-line bg-white px-3 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={state.kind === "submitting"}
                onClick={onSubmit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-extrabold text-on-primary disabled:opacity-50"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {state.kind === "submitting" ? "Calling" : "Call waiter"}
              </button>
            </div>
            {state.kind === "success" ? <p className="mt-2 text-xs font-bold text-emerald-700">Staff has been notified.</p> : null}
            {state.kind === "error" ? <p className="mt-2 text-xs font-bold text-red-700">{state.message}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuEmptyState({ canOrder, search }: { canOrder: boolean; search?: string }) {
  const hasSearch = Boolean(search?.trim());

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
      <ReceiptText className="h-9 w-9 text-gold" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-extrabold text-ink">{hasSearch ? "No matching items" : "No items available"}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-on-surface-variant">
        {hasSearch
          ? "Try another dish name or category."
          : canOrder
            ? "Please check back in a few minutes."
            : "Ordering is currently paused by the restaurant."}
      </p>
    </div>
  );
}

function MenuHero({
  categories,
  itemCount,
  menu,
  onSearchChange,
  search
}: {
  categories: PublicQrMenuCategory[];
  itemCount: number;
  menu: PublicQrMenu;
  onSearchChange: (value: string) => void;
  search: string;
}) {
  const availableCategories = categories.filter((category) => category.items.length > 0);
  const featured = availableCategories.map((category) => ({ category, item: category.items[0] })).slice(0, 4);

  return (
    <section className="bg-[#f5faf8] px-4 pb-5 pt-3">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#98efe2] via-[#62d8cd] to-[#28b7b1] p-5 text-[#102536] shadow-soft-saas">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[62%]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#102536]/60">{menu.tableName}</p>
            <h2 className="mt-3 text-[26px] font-black leading-[1.05]">Order fresh food today</h2>
            <p className="mt-3 text-sm font-semibold text-[#102536]/70">{itemCount} dishes available</p>
            <div className="mt-4 inline-flex rounded-2xl bg-white/40 px-3 py-2 text-3xl font-black text-[#f5c84c]">35%</div>
          </div>
          <div className="relative h-32 flex-1">
            <div className="absolute right-0 top-0 grid h-28 w-28 place-items-center rounded-full bg-white/65 shadow-soft-saas">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-orange-100 via-white to-emerald-100">
                <Utensils className="h-11 w-11 text-primary" aria-hidden="true" />
              </div>
            </div>
            <span className="absolute bottom-3 left-1 h-5 w-5 rounded-full bg-red-400" />
            <span className="absolute bottom-8 right-24 h-4 w-4 rounded-full bg-emerald-500" />
            <span className="absolute right-4 top-24 h-3 w-3 rounded-full bg-yellow-300" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_48px] gap-3">
        <div className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1bb7b5] text-white">
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant"
            placeholder="Search menu..."
            type="search"
          />
        </div>
        <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-on-surface-variant shadow-sm" aria-label="Filter">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {availableCategories.map((category, index) => (
          <a
            key={category.menuCategoryId}
            href={`#category-${category.menuCategoryId}`}
            className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-extrabold ${
              index === 0 ? "border-[#21bdb8] bg-white text-[#159f9b]" : "border-transparent bg-white text-on-surface"
            }`}
          >
            {category.name}
          </a>
        ))}
      </div>

      {featured.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-on-surface">We Offer</h3>
            <p className="text-sm font-extrabold text-[#1bb7b5]">View all</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {featured.map(({ category, item }) => (
              <a key={category.menuCategoryId} href={`#category-${category.menuCategoryId}`} className="rounded-2xl bg-white p-2 text-center shadow-sm">
                <FoodThumb name={item.name} compact />
                <p className="mt-2 truncate text-[11px] font-bold text-on-surface">{category.name}</p>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-28">
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg font-black text-ink">{category.name}</h2>
        <p className="text-sm font-bold text-[#1bb7b5]">{items.length} items</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {items.map((item) => {
          const quantity = cart[item.menuItemId]?.quantity ?? 0;

          return (
            <article key={item.menuItemId} className="relative overflow-hidden rounded-[22px] bg-white p-3 shadow-sm">
              <FoodThumb name={item.name} />

              <div className="mt-3 min-w-0">
                <h3 className="line-clamp-2 min-h-10 break-words text-sm font-black leading-5 text-ink">{item.name}</h3>
                {item.description ? (
                  <p className="mt-1 line-clamp-1 break-words text-[11px] font-medium leading-4 text-on-surface-variant">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-nowrap text-sm font-black text-ink">{formatPrice(item.price)}</p>
              </div>

              {canOrder ? (
                quantity > 0 ? (
                  <div className="mt-3 flex h-9 items-center justify-between overflow-hidden rounded-full border border-[#dcece8] bg-[#f5faf8]">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center text-[#159f9b]"
                      onClick={() => onDecrement(item.menuItemId)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="grid h-9 w-7 place-items-center text-xs font-extrabold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center text-[#159f9b]"
                      onClick={() => onAdd(item, category.name)}
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[#e9fbf8] text-[#159f9b]"
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

function FlyingCartItem({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -ml-9">
      <div className="qr-fly-to-cart grid h-16 w-16 place-items-center rounded-full bg-white shadow-modal ring-4 ring-[#e9fbf8]">
        <FoodThumb name={name} compact />
      </div>
    </div>
  );
}

function CheckoutBar({
  cartCount,
  cartTotal,
  pulseKey,
  recentItem,
  onOpen
}: {
  cartCount: number;
  cartTotal: number;
  pulseKey: number;
  recentItem: PublicQrMenuItem | null;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <button
          type="button"
          className="pointer-events-auto flex min-h-16 w-full items-center gap-3 rounded-[22px] bg-primary px-3 py-2 text-on-primary shadow-modal"
          onClick={onOpen}
        >
          <span key={pulseKey} className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm animate-[pulse_650ms_ease-out_1]">
            {recentItem ? <FoodThumb name={recentItem.name} compact /> : <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />}
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#f4c542] px-1 text-[11px] font-black leading-none text-primary">
              {cartCount}
            </span>
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-black">View cart</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-white/65">{recentItem?.name ?? `${cartCount} selected items`}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm font-black">
            {formatPrice(cartTotal)}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
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
  isRefreshing,
  orders,
  refreshError,
  onBackToMenu,
  onRefresh
}: {
  isRefreshing: boolean;
  orders: PublicQrOrder[];
  refreshError: string | null;
  onBackToMenu: () => void;
  onRefresh: () => void;
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
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Updating" : "Refresh"}
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink"
            onClick={onBackToMenu}
          >
            Menu
          </button>
        </div>
      </div>

      {refreshError ? (
        <div className="mb-4 flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">{refreshError}</p>
        </div>
      ) : null}

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

function FloatingMenuButton({ hasCheckoutBar, onOpen }: { hasCheckoutBar: boolean; onOpen: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className={`mx-auto flex w-full max-w-md justify-end px-4 ${hasCheckoutBar ? "pb-24" : "pb-5"}`}>
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

function FoodThumb({ compact = false, name }: { compact?: boolean; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-white to-emerald-100 ${compact ? "mx-auto h-12 w-12" : "h-28 w-full"}`}>
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1bb7b5]/20" />
      <div className="absolute -bottom-3 left-2 h-10 w-10 rounded-full bg-[#f4c542]/30" />
      <div className="absolute inset-0 grid place-items-center p-3">
        <div className={`grid place-items-center rounded-full bg-white text-primary shadow-soft-saas ${compact ? "h-9 w-9 text-[11px]" : "h-20 w-20 text-lg"}`}>
          <span className="font-black">{initials || <Utensils className="h-5 w-5" aria-hidden="true" />}</span>
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

function filterCategories(categories: PublicQrMenuCategory[], search: string): PublicQrMenuCategory[] {
  const sorted = [...categories].sort((left, right) => left.displayOrder - right.displayOrder);
  const query = search.trim().toLowerCase();

  if (!query) {
    return sorted.map((category) => ({
      ...category,
      items: [...category.items].sort((left, right) => left.displayOrder - right.displayOrder)
    }));
  }

  return sorted
    .map((category) => ({
      ...category,
      items: [...category.items]
        .filter((item) =>
          [item.name, item.description, category.name]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query))
        )
        .sort((left, right) => left.displayOrder - right.displayOrder)
    }))
    .filter((category) => category.items.length > 0);
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

function saveStoredOrders(qrToken: string, orders: PublicQrOrder[]): PublicQrOrder[] {
  const next = orders.filter(isPublicQrOrder).slice(0, 20);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(orderStorageKey(qrToken), JSON.stringify(next));
  }

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
  }).format(parseUtcDate(value));
}

function parseUtcDate(value: string): Date {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimeZone ? value : `${value}Z`);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}
