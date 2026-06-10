"use client";

import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountryPhoneInput } from "../../../components/country-phone-input";
import {
  ApiError,
  createWaiterCall,
  createPublicQrOrder,
  getPublicQrMenu,
  lookupPublicCustomer,
  type CreatePublicQrOrderInput,
  type PublicCustomerLookup,
  type PublicCustomerRecentOrder,
  type PublicQrMenu,
  type PublicQrMenuCategory,
  type PublicQrMenuItem,
  type PublicQrOrder
} from "../../../lib/api";
import { firstInvalid, validateOptionalText, validatePhone, validateRequired } from "../../../lib/validation";

type CartLine = {
  cartLineId: string;
  item: PublicQrMenuItem;
  categoryName: string;
  variant: PublicQrMenuItem["variants"][number] | null;
  itemNote: string;
  quantity: number;
};

type ActiveView = "menu" | "cart" | "customerOrders";

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
  const [customerPhoneCountryCode, setCustomerPhoneCountryCode] = useState("IN");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<PublicCustomerLookup | null>(null);
  const [isCustomerLookupLoading, setIsCustomerLookupLoading] = useState(false);
  const [lastLookupWhatsApp, setLastLookupWhatsApp] = useState("");
  const [notes, setNotes] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("menu");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [waiterCallNote, setWaiterCallNote] = useState("");
  const [waiterCallState, setWaiterCallState] = useState<WaiterCallState>({ kind: "idle" });
  const [flyingItem, setFlyingItem] = useState<{ key: number; item: PublicQrMenuItem } | null>(null);
  const [recentItem, setRecentItem] = useState<PublicQrMenuItem | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ item: PublicQrMenuItem; categoryName: string } | null>(null);
  const [barPulseKey, setBarPulseKey] = useState(0);

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cartLines.reduce((total, line) => total + getCartLinePrice(line) * line.quantity, 0);
  const canOrder = currentMenu.orderSettings.enableDirectQrOrdering;
  const canCallWaiter = currentMenu.orderSettings.waiterCallEnabled;
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
  const menuItemById = useMemo(() => {
    const lookup = new Map<string, PublicQrMenuItem>();
    currentMenu.categories.forEach((category) => {
      category.items.forEach((item) => lookup.set(item.menuItemId, item));
    });
    return lookup;
  }, [currentMenu.categories]);
  const categoryNameByMenuItemId = useMemo(() => {
    const lookup = new Map<string, string>();
    currentMenu.categories.forEach((category) => {
      category.items.forEach((item) => lookup.set(item.menuItemId, category.name));
    });
    return lookup;
  }, [currentMenu.categories]);

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
    const cleanWhatsApp = customerWhatsApp.trim();
    const phoneValidation = validatePhone(cleanWhatsApp, "WhatsApp number", false);

    if (!cleanWhatsApp || !phoneValidation.isValid) {
      setRecognizedCustomer(null);
      setIsCustomerLookupLoading(false);
      return;
    }

    if (cleanWhatsApp === lastLookupWhatsApp) {
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsCustomerLookupLoading(true);
      try {
        const customer = await lookupPublicCustomer(currentMenu.qrToken, cleanWhatsApp);
        if (!isActive) {
          return;
        }

        setRecognizedCustomer(customer);
        setLastLookupWhatsApp(cleanWhatsApp);
        if (customer?.name && customerName.trim().length === 0) {
          setCustomerName(customer.name);
        }
      } catch {
        if (isActive) {
          setRecognizedCustomer(null);
        }
      } finally {
        if (isActive) {
          setIsCustomerLookupLoading(false);
        }
      }
    }, 450);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [currentMenu.qrToken, customerName, customerWhatsApp, lastLookupWhatsApp]);

  function addItem(item: PublicQrMenuItem, categoryName: string, variant: PublicQrMenuItem["variants"][number] | null = null) {
    if (!canOrder) {
      return;
    }

    setSubmitState({ kind: "idle" });
    setFlyingItem({ key: Date.now(), item });
    setRecentItem(item);
    setVariantPicker(null);
    setCart((current) => {
      const cartLineId = getCartLineId(item.menuItemId, variant?.menuItemVariantId ?? null);
      const existing = current[cartLineId];
      return {
        ...current,
        [cartLineId]: {
          cartLineId,
          item,
          categoryName,
          variant,
          itemNote: existing?.itemNote ?? "",
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
    window.setTimeout(() => {
      setFlyingItem(null);
      setBarPulseKey((current) => current + 1);
    }, 1120);
  }

  function decrementItem(cartLineId: string) {
    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[cartLineId];
      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        const next = { ...current };
        delete next[cartLineId];
        setRecentItem((currentRecent) => {
          if (currentRecent?.menuItemId !== existing.item.menuItemId) {
            return currentRecent;
          }

          const remaining = Object.values(next);
          return remaining[remaining.length - 1]?.item ?? null;
        });
        return next;
      }

      return {
        ...current,
        [cartLineId]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  }

  function updateCartLineNote(cartLineId: string, itemNote: string) {
    setSubmitState({ kind: "idle" });
    setCart((current) => {
      const existing = current[cartLineId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [cartLineId]: {
          ...existing,
          itemNote
        }
      };
    });
  }

  function addRecentOrderToCart(order: PublicCustomerRecentOrder) {
    const reorderLines = order.items
      .map((recentItem) => {
        const item = menuItemById.get(recentItem.menuItemId);
        if (!item) {
          return null;
        }

        const variant = recentItem.menuItemVariantId
          ? item.variants.find((candidate) => candidate.menuItemVariantId === recentItem.menuItemVariantId) ?? null
          : null;

        if (recentItem.menuItemVariantId && !variant) {
          return null;
        }

        return {
          cartLineId: getCartLineId(item.menuItemId, variant?.menuItemVariantId ?? null),
          item,
          categoryName: categoryNameByMenuItemId.get(item.menuItemId) ?? "Menu",
          variant,
          itemNote: recentItem.itemNote ?? "",
          quantity: recentItem.quantity
        };
      })
      .filter((line): line is CartLine => line !== null);

    setSubmitState({ kind: "idle" });
    if (reorderLines.length === 0) {
      setSubmitState({ kind: "error", message: "Items from this order are not available right now." });
      return;
    }

    setCart((current) => {
      const next = { ...current };

      reorderLines.forEach((line) => {
        const existing = next[line.cartLineId];
        next[line.cartLineId] = {
          ...line,
          itemNote: existing?.itemNote ?? line.itemNote,
          quantity: (existing?.quantity ?? 0) + line.quantity
        };
      });

      return next;
    });

    setBarPulseKey((current) => current + 1);
  }

  async function submitOrder() {
    if (!canOrder || cartLines.length === 0 || submitState.kind === "submitting") {
      return;
    }

    const validation = firstInvalid(
      menu.orderSettings.requireCustomerName ? validateRequired(customerName, "Name") : validateOptionalText(customerName, "Name", 120),
      validatePhone(customerWhatsApp, "WhatsApp number", menu.orderSettings.requireCustomerWhatsApp),
      marketingConsent && !customerWhatsApp.trim()
        ? { isValid: false, message: "Enter WhatsApp number to receive updates." }
        : { isValid: true, message: null },
      validateOptionalText(notes, "Notes", 500),
      ...cartLines.map((line) => validateOptionalText(line.itemNote, `${line.item.name} note`, 200))
    );
    if (!validation.isValid) {
      setSubmitState({ kind: "error", message: validation.message ?? "Order details are invalid." });
      return;
    }

    const input: CreatePublicQrOrderInput = {
      customerName: valueOrNull(customerName),
      customerWhatsApp: valueOrNull(customerWhatsApp),
      notes: valueOrNull(notes),
      marketingConsent,
      items: cartLines.map((line) => ({
        menuItemId: line.item.menuItemId,
        menuItemVariantId: line.variant?.menuItemVariantId ?? null,
        itemNote: valueOrNull(line.itemNote),
        quantity: line.quantity
      }))
    };

    setSubmitState({ kind: "submitting" });

    try {
      const order = await createPublicQrOrder(currentMenu.qrToken, input);
      setCart({});
      setNotes("");
      setMarketingConsent(false);
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

  function handleHeaderBack() {
    if (activeView === "menu") {
      window.history.back();
      return;
    }

    if (activeView === "customerOrders") {
      setActiveView("cart");
      return;
    }

    returnToMenu();
  }

  async function submitWaiterCall() {
    if (!canCallWaiter || waiterCallState.kind === "submitting") {
      return;
    }

    const validation = validateOptionalText(waiterCallNote, "Waiter-call note", 500);
    if (!validation.isValid) {
      setWaiterCallState({ kind: "error", message: validation.message ?? "Waiter-call note is invalid." });
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
      <QrPageHeader branchLogoUrl={currentMenu.branchLogoUrl} branchName={currentMenu.branchName} tableName={currentMenu.tableName} onBack={handleHeaderBack} />

      {activeView === "customerOrders" ? (
        <CustomerPreviousOrdersPage
          customer={recognizedCustomer}
          menuItemById={menuItemById}
          qrToken={currentMenu.qrToken}
          onBackToCart={() => setActiveView("cart")}
          onReorder={(order) => {
            addRecentOrderToCart(order);
            setActiveView("cart");
          }}
        />
      ) : activeView === "cart" ? (
        <CartPage
          menuItemById={menuItemById}
          cartCount={cartCount}
          cartLines={cartLines}
          cartTotal={cartTotal}
          customerName={customerName}
          customerPhoneCountryCode={customerPhoneCountryCode}
          customerWhatsApp={customerWhatsApp}
          isCustomerLookupLoading={isCustomerLookupLoading}
          marketingConsent={marketingConsent}
          notes={notes}
          orderSettings={currentMenu.orderSettings}
          qrToken={currentMenu.qrToken}
          recognizedCustomer={recognizedCustomer}
          submitState={submitState}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneCountryChange={setCustomerPhoneCountryCode}
          onCustomerWhatsAppChange={setCustomerWhatsApp}
          onDecrement={decrementItem}
          onItemNoteChange={updateCartLineNote}
          onMarketingConsentChange={setMarketingConsent}
          onBackToMenu={returnToMenu}
          onCheckPreviousOrders={() => setActiveView("customerOrders")}
          onNotesChange={setNotes}
          onSubmit={submitOrder}
        />
      ) : (
        <>
          {flyingItem ? <FlyingCartItem key={flyingItem.key} item={flyingItem.item} /> : null}
          {!canOrder ? <OrderingUnavailableNotice /> : null}

          <MenuHero
            cartCount={cartCount}
            categories={categories}
            itemCount={itemCount}
            menu={currentMenu}
            search={search}
            onCartOpen={() => setActiveView("cart")}
            onCategoryOpen={() => setIsCategoryOpen(true)}
            onSearchChange={setSearch}
          />

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

          <div className="flex-1 space-y-6 bg-[#f8f9fa] px-4 pb-28">
            {itemCount > 0 ? (
              categories.map((category) => (
                <MenuCategorySection
                  key={category.menuCategoryId}
                  canOrder={canOrder}
                  cart={cart}
                  category={category}
                  onAdd={addItem}
                  onChooseVariant={(item, categoryName) => setVariantPicker({ item, categoryName })}
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
          {variantPicker ? (
            <VariantPickerSheet
              categoryName={variantPicker.categoryName}
              item={variantPicker.item}
              onAdd={(variant) => addItem(variantPicker.item, variantPicker.categoryName, variant)}
              onClose={() => setVariantPicker(null)}
            />
          ) : null}
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

function QrPageHeader({ branchLogoUrl, branchName, onBack, tableName }: { branchLogoUrl?: string | null; branchName: string; onBack: () => void; tableName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e6eeea] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="grid h-10 grid-cols-[40px_1fr_40px] items-center">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-[#001c11]" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[15px] font-black uppercase tracking-normal text-[#001c11]">{branchName}</h1>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#5a625e]">{tableName}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#e7f8ee] text-[#006d36]" aria-hidden="true">
          {branchLogoUrl ? <img src={branchLogoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
        </div>
      </div>
    </header>
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
    <section className="bg-[#f8f9fa] px-4 pb-5">
      <div className="rounded-2xl border border-[#cfe1d8] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7f8ee] text-[#006d36]">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">Call Waiter</p>
            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">Staff at your service</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                maxLength={500}
                placeholder="Optional note"
                className="h-11 min-w-0 rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 text-sm outline-none focus:border-[#006d36]"
              />
              <button
                type="button"
                disabled={state.kind === "submitting"}
                onClick={onSubmit}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#001c11] px-4 text-sm font-extrabold text-white disabled:opacity-50"
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
  cartCount,
  categories,
  itemCount,
  menu,
  onCartOpen,
  onCategoryOpen,
  onSearchChange,
  search
}: {
  cartCount: number;
  categories: PublicQrMenuCategory[];
  itemCount: number;
  menu: PublicQrMenu;
  onCartOpen: () => void;
  onCategoryOpen: () => void;
  onSearchChange: (value: string) => void;
  search: string;
}) {
  const availableCategories = categories.filter((category) => category.items.length > 0);
  const featured = availableCategories.map((category) => ({ category, item: category.items[0] })).slice(0, 3);
  const offers = (menu.offers ?? []).sort((left, right) => left.displayOrder - right.displayOrder);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeOffer = offers[activeOfferIndex] ?? null;
  const fallbackFeature = featured[0]?.item ?? null;
  const heroImageUrl = activeOffer?.imageUrl ?? fallbackFeature?.imageUrl ?? null;
  const heroImageAlt = activeOffer?.imageAltText ?? activeOffer?.title ?? fallbackFeature?.imageAltText ?? fallbackFeature?.name ?? menu.branchName;

  useEffect(() => {
    if (offers.length <= 1) {
      setActiveOfferIndex(0);
      return;
    }

    setActiveOfferIndex((current) => (current >= offers.length ? 0 : current));
    const timer = window.setInterval(() => {
      setActiveOfferIndex((current) => (current + 1) % offers.length);
    }, 4_200);

    return () => window.clearInterval(timer);
  }, [offers.length]);

  function handleOfferTouchEnd(clientX: number) {
    if (touchStartX === null || offers.length <= 1) {
      setTouchStartX(null);
      return;
    }

    const delta = touchStartX - clientX;
    if (Math.abs(delta) > 36) {
      setActiveOfferIndex((current) => (delta > 0 ? current + 1 : current - 1 + offers.length) % offers.length);
    }

    setTouchStartX(null);
  }

  return (
    <section className="bg-[#f8f9fa] px-4 pb-5 pt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#e7f8ee] text-[#006d36]">
            {menu.branchLogoUrl ? <img src={menu.branchLogoUrl} alt={`${menu.branchName} logo`} className="h-full w-full object-cover" /> : <Store className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#006d36]">{menu.tableName}</p>
            <h1 className="mt-1 truncate text-2xl font-black leading-8 text-[#001c11]">{menu.branchName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onCartOpen} className="relative grid h-12 w-12 place-items-center rounded-full bg-[#001c11] text-white shadow-sm" aria-label="Open cart">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 ? (
              <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#83fba5] px-1 text-[10px] font-black text-[#00210c]">{cartCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="mb-5 flex h-16 items-center gap-3 rounded-full border border-[#dce4df] bg-white px-5 shadow-sm">
        <Search className="h-6 w-6 shrink-0 text-[#6b746f]" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#191c1d] outline-none placeholder:text-[#a8afab]"
          placeholder="What are you craving today?"
          type="search"
        />
        {search ? (
          <button type="button" onClick={() => onSearchChange("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#6b746f]" aria-label="Clear search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onCategoryOpen} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#466155]" aria-label="Open categories">
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-[#0f3224] text-white shadow-soft-saas"
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleOfferTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {heroImageUrl ? <img src={heroImageUrl} alt={heroImageAlt} className="absolute inset-0 h-full w-full object-cover" /> : <FoodPosterFallback name={menu.branchName} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
        <div className="relative flex min-h-[320px] flex-col justify-end p-6">
          <div className="mb-auto flex justify-end">
            {activeOffer?.discountText ? (
              <div className="rounded-[28px] border border-white/20 bg-white/20 px-5 py-4 text-center shadow-modal backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white/75">Promo</p>
                <p className="mt-1 text-xl font-black">{activeOffer.discountText}</p>
              </div>
            ) : null}
          </div>
          <div>
            <span className="inline-flex rounded-lg bg-[#00743a] px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              {activeOffer ? "Newbie Offer" : "Recommended"}
            </span>
            <h2 className="mt-4 max-w-[13rem] text-[40px] font-black leading-[1.08] tracking-normal">{activeOffer?.title ?? fallbackFeature?.name ?? "Explore Menu"}</h2>
            <p className="mt-3 max-w-[18rem] text-base font-semibold leading-6 text-white/80">{activeOffer?.subtitle ?? `${itemCount} dishes available today`}</p>
          </div>
        </div>
        {offers.length > 1 ? (
          <div className="absolute bottom-5 right-5 flex gap-1.5">
            {offers.map((offer, index) => (
              <button
                key={offer.branchOfferId}
                type="button"
                onClick={() => setActiveOfferIndex(index)}
                className={`h-1.5 rounded-full transition-all ${index === activeOfferIndex ? "w-6 bg-white" : "w-1.5 bg-white/45"}`}
                aria-label={`Show offer ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {availableCategories.map((category, index) => (
          <a
            key={category.menuCategoryId}
            href={`#category-${category.menuCategoryId}`}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold ${
              index === 0 ? "border-[#66dd8b] bg-[#83fba5] text-[#00210c]" : "border-[#d9e4df] bg-white text-[#414844]"
            }`}
          >
            {category.name}
          </a>
        ))}
      </div>

      {featured.length > 0 ? (
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-black text-[#001c11]">Explore Menu</h3>
            <button type="button" onClick={onCategoryOpen} className="text-sm font-black text-[#006d36]">Full Gallery</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map(({ category, item }) => (
              <a key={category.menuCategoryId} href={`#category-${category.menuCategoryId}`} className="relative min-h-[142px] overflow-hidden rounded-[26px] bg-[#0f3224] p-4 text-white shadow-sm">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAltText ?? item.name} className="absolute inset-0 h-full w-full object-cover" /> : <FoodPosterFallback name={category.name} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative flex h-full min-h-[110px] flex-col justify-end">
                  <p className="text-lg font-black leading-5">{category.name}</p>
                  <p className="mt-1 text-sm font-semibold text-white/75">{category.items.length} items</p>
                </div>
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
  onChooseVariant,
  onDecrement
}: {
  canOrder: boolean;
  cart: Record<string, CartLine>;
  category: PublicQrMenuCategory;
  onAdd: (item: PublicQrMenuItem, categoryName: string, variant?: PublicQrMenuItem["variants"][number] | null) => void;
  onChooseVariant: (item: PublicQrMenuItem, categoryName: string) => void;
  onDecrement: (cartLineId: string) => void;
}) {
  const items = [...category.items].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-28">
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-2xl font-black text-[#001c11]">{category.name}</h2>
        <p className="text-sm font-black text-[#006d36]">{items.length} items</p>
      </div>

      <div className="mt-3 grid gap-4">
        {items.map((item) => {
          const variants = item.variants ?? [];
          const hasVariants = variants.length > 0;
          const singleCartLineId = getCartLineId(item.menuItemId, null);
          const quantity = Object.values(cart)
            .filter((line) => line.item.menuItemId === item.menuItemId)
            .reduce((total, line) => total + line.quantity, 0);
          const singleQuantity = cart[singleCartLineId]?.quantity ?? 0;
          const displayPrice = hasVariants ? Math.min(...variants.map((variant) => variant.price)) : item.price;

          return (
            <article key={item.menuItemId} className="grid min-h-[176px] grid-cols-[1fr_8.25rem] gap-4 rounded-xl border border-[#cfd8d3] bg-white p-4 shadow-sm">
              <div className="flex min-w-0 flex-col">
                <h3 className="line-clamp-2 break-words text-xl font-black leading-6 text-[#001c11]">{item.name}</h3>
                <p className="mt-2 line-clamp-3 break-words text-sm font-medium leading-5 text-[#5a625e]">{item.description || "Freshly prepared by the kitchen."}</p>
                <p className="mt-3 whitespace-nowrap text-lg font-black text-[#006d36]">{hasVariants ? `From ${formatPrice(displayPrice)}` : formatPrice(displayPrice)}</p>

                {canOrder ? (
                  hasVariants ? (
                    <button
                      type="button"
                      className="mt-auto inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-[#83fba5] px-4 text-sm font-black uppercase tracking-normal text-[#00210c]"
                      onClick={() => onChooseVariant(item, category.name)}
                      aria-label={`Choose variant for ${item.name}`}
                    >
                      {quantity > 0 ? `${quantity} Added` : "Choose"}
                    </button>
                  ) : singleQuantity > 0 ? (
                    <div className="mt-auto flex h-10 w-32 items-center justify-between overflow-hidden rounded-lg border border-[#cfe1d8] bg-[#f8f9fa]">
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center text-[#006d36]"
                        onClick={() => onDecrement(singleCartLineId)}
                        aria-label={`Remove one ${item.name}`}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="grid h-10 w-10 place-items-center text-sm font-black text-[#001c11]">{singleQuantity}</span>
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center text-[#006d36]"
                        onClick={() => onAdd(item, category.name, null)}
                        aria-label={`Add one ${item.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-auto inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-[#83fba5] px-4 text-sm font-black uppercase tracking-normal text-[#00210c]"
                      onClick={() => onAdd(item, category.name, null)}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add
                    </button>
                  )
                ) : null}
              </div>

              <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FlyingCartItem({ item }: { item: PublicQrMenuItem }) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -ml-9">
      <div className="qr-fly-to-cart grid h-16 w-16 place-items-center rounded-full bg-white shadow-modal ring-4 ring-[#e9fbf8]">
        <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} compact />
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
          className="pointer-events-auto flex min-h-16 w-full items-center gap-3 rounded-[24px] bg-[#001c11] px-4 py-3 text-white shadow-modal"
          onClick={onOpen}
        >
          <span key={pulseKey} className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 shadow-sm animate-[pulse_650ms_ease-out_1]">
            {recentItem ? <FoodThumb imageAltText={recentItem.imageAltText} imageUrl={recentItem.imageUrl} name={recentItem.name} compact /> : <ShoppingCart className="h-5 w-5 text-white" aria-hidden="true" />}
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#83fba5] px-1 text-[11px] font-black leading-none text-[#00210c]">
              {cartCount}
            </span>
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-lg font-black">View Cart</span>
            <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/55">{recentItem?.name ?? `${cartCount} selected items`}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xl font-black">
            {formatPrice(cartTotal)}
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#00743a]">
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </span>
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
  customerPhoneCountryCode,
  customerWhatsApp,
  isCustomerLookupLoading,
  marketingConsent,
  notes,
  orderSettings,
  qrToken,
  menuItemById,
  recognizedCustomer,
  submitState,
  onCustomerNameChange,
  onCustomerPhoneCountryChange,
  onCustomerWhatsAppChange,
  onDecrement,
  onItemNoteChange,
  onMarketingConsentChange,
  onBackToMenu,
  onCheckPreviousOrders,
  onNotesChange,
  onSubmit
}: {
  cartCount: number;
  cartLines: CartLine[];
  cartTotal: number;
  customerName: string;
  customerPhoneCountryCode: string;
  customerWhatsApp: string;
  isCustomerLookupLoading: boolean;
  marketingConsent: boolean;
  notes: string;
  orderSettings: PublicQrMenu["orderSettings"];
  qrToken: string;
  menuItemById: Map<string, PublicQrMenuItem>;
  recognizedCustomer: PublicCustomerLookup | null;
  submitState: SubmitState;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneCountryChange: (value: string) => void;
  onCustomerWhatsAppChange: (value: string) => void;
  onDecrement: (cartLineId: string) => void;
  onItemNoteChange: (cartLineId: string, value: string) => void;
  onMarketingConsentChange: (value: boolean) => void;
  onBackToMenu: () => void;
  onCheckPreviousOrders: () => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (submitState.kind === "success") {
    return <OrderPlacedView menuItemById={menuItemById} order={submitState.order} qrToken={qrToken} onBackToMenu={onBackToMenu} />;
  }

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">
            {cartCount} selected item{cartCount === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 text-2xl font-black leading-8 text-[#001c11]">Cart</h1>
        </div>
        <button type="button" className="rounded-full border border-[#d9e4df] bg-white px-4 py-2 text-sm font-black text-[#001c11] shadow-sm" onClick={onBackToMenu}>
          Menu
        </button>
      </div>

      {submitState.kind === "error" ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold">{submitState.message}</p>
        </div>
      ) : null}

      {cartLines.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {cartLines.map((line) => (
              <div key={line.cartLineId} className="rounded-2xl border border-[#d9e4df] bg-white p-3 shadow-sm">
                <div className="grid grid-cols-[4.75rem_1fr_auto] gap-3">
                  <FoodThumb imageAltText={line.item.imageAltText} imageUrl={line.item.imageUrl} name={line.item.name} compact />
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-black text-[#001c11]">{formatCartItemName(line)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#5a625e]">{line.categoryName}</p>
                    <p className="mt-2 text-sm font-black text-[#006d36]">{formatPrice(getCartLinePrice(line))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#001c11]">x{line.quantity}</span>
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-full border border-[#d9e4df] bg-[#f8f9fa] text-[#414844]"
                      onClick={() => onDecrement(line.cartLineId)}
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
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Item note</span>
                  <textarea
                    className="mt-1 min-h-16 w-full resize-none rounded-xl border border-[#d9e4df] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006d36]"
                    value={line.itemNote}
                    onChange={(event) => onItemNoteChange(line.cartLineId, event.target.value)}
                    maxLength={200}
                    placeholder="Less spicy, no onion, no ice..."
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-[#5a625e]">
              <span>Subtotal</span>
              <span className="font-black text-[#001c11]">{formatPrice(cartTotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#e6eeea] pt-3">
              <span className="text-base font-black text-[#001c11]">Total amount</span>
              <span className="text-xl font-black text-[#006d36]">{formatPrice(cartTotal)}</span>
            </div>
          </div>

          {isCustomerLookupLoading ? (
            <div className="rounded-2xl border border-[#d9e4df] bg-white p-4 text-sm font-semibold text-[#5a625e] shadow-sm">
              Checking customer history...
            </div>
          ) : recognizedCustomer ? (
            <div className="rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#006d36]">Welcome back</p>
                  <h2 className="mt-1 truncate text-lg font-black text-[#001c11]">
                    {recognizedCustomer.name ?? "Customer"}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#5a625e]">
                    {recognizedCustomer.totalOrderCount} previous order{recognizedCustomer.totalOrderCount === 1 ? "" : "s"}
                  </p>
                </div>
                {recognizedCustomer.marketingConsent ? (
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#006d36]">Opted in</span>
                ) : null}
              </div>

              <button
                type="button"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#001c11] px-4 text-sm font-black text-white"
                onClick={onCheckPreviousOrders}
              >
                Check previous orders
              </button>
            </div>
          ) : null}

          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Name{orderSettings.requireCustomerName ? " *" : ""}
              </span>
              <input
                className="mt-1 h-12 w-full rounded-xl border border-[#d9e4df] bg-white px-3 text-sm outline-none focus:border-[#006d36]"
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                maxLength={120}
              />
            </label>
            <CountryPhoneInput
              countryCode={customerPhoneCountryCode}
              label="WhatsApp"
              required={orderSettings.requireCustomerWhatsApp}
              value={customerWhatsApp}
              onChange={onCustomerWhatsAppChange}
              onCountryChange={(countryCode, value) => {
                onCustomerPhoneCountryChange(countryCode);
                onCustomerWhatsAppChange(value);
              }}
            />
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">Notes</span>
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-xl border border-[#d9e4df] bg-white px-3 py-2 text-sm outline-none focus:border-[#006d36]"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              maxLength={500}
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(event) => onMarketingConsentChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#b9c8c0] text-[#006d36] focus:ring-[#006d36]"
            />
            <span className="text-sm font-semibold leading-5 text-[#414844]">
              Send me WhatsApp updates and offers from this restaurant.
            </span>
          </label>

          <button
            type="button"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#001c11] px-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartCount === 0 || submitState.kind === "submitting"}
            onClick={onSubmit}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitState.kind === "submitting" ? "Sending order" : "Place order"}
          </button>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-ink">Your cart is empty</p>
            <p className="mt-1 text-sm text-on-surface-variant">Add menu items to see total amount and place an order.</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#001c11] px-4 py-2 text-sm font-bold text-white"
              onClick={onBackToMenu}
            >
              Back to menu
            </button>
          </div>
        )}
    </section>
  );
}

function OrderPlacedView({
  menuItemById,
  order,
  qrToken,
  onBackToMenu
}: {
  menuItemById: Map<string, PublicQrMenuItem>;
  order: PublicQrOrder;
  qrToken: string;
  onBackToMenu: () => void;
}) {
  const trackingHref = `/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`;

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">Order confirmed</p>
        <h1 className="mt-1 text-2xl font-black leading-8 text-[#001c11]">Order placed</h1>
      </div>
      <div className="rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-[#001c11]">Order placed</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">Staff received your order.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-[#d9e4df] bg-[#f8f9fa] p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
            <p className="mt-1 text-lg font-black text-[#001c11]">#{shortOrderCode(order.orderId)}</p>
          </div>
          <div className="rounded-xl border border-[#d9e4df] bg-[#f8f9fa] p-3">
            <p className="text-xs font-bold uppercase text-on-surface-variant">Status</p>
            <p className="mt-1 text-lg font-black text-[#006d36]">{order.orderStatusCode}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e6eeea] pb-3">
          <h3 className="text-sm font-black uppercase text-[#001c11]">Items</h3>
          <p className="text-sm font-bold text-on-surface-variant">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </div>

        <div className="divide-y divide-[#e6eeea]">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="grid grid-cols-[3.5rem_1fr_auto] gap-3 py-3">
              <OrderItemThumb item={menuItemById.get(item.menuItemId)} name={item.menuItemName} />
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
      </div>

      <div className="mt-4 grid gap-3">
        <Link
          href={trackingHref}
          className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#006d36] px-4 text-sm font-black text-white"
        >
          Track order
        </Link>
        <button
          type="button"
          className="h-14 w-full rounded-2xl bg-[#001c11] px-4 text-sm font-black text-white"
          onClick={onBackToMenu}
        >
          Back to menu
        </button>
      </div>
    </section>
  );
}

function CustomerPreviousOrdersPage({
  customer,
  menuItemById,
  qrToken,
  onBackToCart,
  onReorder
}: {
  customer: PublicCustomerLookup | null;
  menuItemById: Map<string, PublicQrMenuItem>;
  qrToken: string;
  onBackToCart: () => void;
  onReorder: (order: PublicCustomerRecentOrder) => void;
}) {
  const orders = customer?.recentOrders ?? [];

  return (
    <section className="min-h-dvh flex-1 bg-[#f8f9fa] px-4 py-5 pb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006d36]">
            {orders.length} previous order{orders.length === 1 ? "" : "s"}
          </p>
          <h1 className="mt-1 truncate text-2xl font-black leading-8 text-[#001c11]">
            {customer?.name ? `${customer.name}'s orders` : "Previous orders"}
          </h1>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#d9e4df] bg-white px-4 py-2 text-sm font-black text-[#001c11] shadow-sm"
          onClick={onBackToCart}
        >
          Cart
        </button>
      </div>

      {customer ? (
        <div className="mb-4 rounded-2xl border border-[#bfe6cf] bg-[#f1fbf5] p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#006d36]">Welcome back</p>
          <p className="mt-1 text-lg font-black text-[#001c11]">{customer.name ?? "Customer"}</p>
          <p className="mt-1 text-sm font-semibold text-[#5a625e]">{customer.whatsAppNumber}</p>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.orderId} className="rounded-2xl border border-[#d9e4df] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Order</p>
                  <h3 className="mt-1 text-lg font-black text-[#001c11]">#{shortOrderCode(order.orderId)}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">{formatOrderDate(order.createdAtUtc)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Total</p>
                  <p className="mt-1 text-base font-black text-[#006d36]">{formatPrice(order.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-3 divide-y divide-[#e6eeea] border-t border-[#e6eeea]">
                {order.items.map((item, index) => (
                  <div key={`${order.orderId}:${item.menuItemId}:${item.menuItemVariantId ?? "base"}:${index}`} className="grid grid-cols-[3.5rem_1fr_auto] gap-3 py-3">
                    <OrderItemThumb item={menuItemById.get(item.menuItemId)} name={item.menuItemName} />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-[#001c11]">{formatOrderItemName(item.menuItemName, item.variantName)}</p>
                      {item.itemNote ? <p className="mt-1 rounded-lg bg-[#f8f9fa] px-2 py-1 text-xs font-semibold text-[#5a625e]">{item.itemNote}</p> : null}
                    </div>
                    <p className="text-sm font-black text-[#001c11]">x{item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  href={`/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9e4df] bg-white px-4 text-sm font-black text-[#001c11]"
                >
                  Track
                </Link>
                <button
                  type="button"
                  className="h-12 rounded-xl bg-[#001c11] px-4 text-sm font-black text-white"
                  onClick={() => onReorder(order)}
                >
                  Reorder
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#d9e4df] bg-white p-5 text-center shadow-sm">
          <ReceiptText className="h-8 w-8 text-gold" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-[#001c11]">No previous orders found</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Orders linked to this WhatsApp number will appear here.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[#001c11] px-4 py-2 text-sm font-bold text-white"
            onClick={onBackToCart}
          >
            Back to cart
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

function VariantPickerSheet({
  categoryName,
  item,
  onAdd,
  onClose
}: {
  categoryName: string;
  item: PublicQrMenuItem;
  onAdd: (variant: PublicQrMenuItem["variants"][number]) => void;
  onClose: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-md px-4 pb-5">
        <div className="rounded-[24px] border border-[#d9e4df] bg-white p-4 shadow-modal">
          <div className="flex items-start gap-3">
            <FoodThumb imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} compact />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006d36]">{categoryName}</p>
              <h3 className="mt-1 text-lg font-black text-[#001c11]">{item.name}</h3>
              <p className="mt-1 text-sm font-medium text-[#5a625e]">Choose a portion or size.</p>
            </div>
            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d9e4df] text-[#414844]" onClick={onClose} aria-label="Close variants">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {(item.variants ?? []).map((variant) => (
              <button
                key={variant.menuItemVariantId}
                type="button"
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d9e4df] bg-[#f8f9fa] px-4 py-3 text-left"
                onClick={() => onAdd(variant)}
              >
                <span className="font-black text-[#001c11]">{variant.name}</span>
                <span className="font-black text-[#006d36]">{formatPrice(variant.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
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

function FoodThumb({ compact = false, imageAltText, imageUrl, name }: { compact?: boolean; imageAltText?: string | null; imageUrl?: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-white to-emerald-100 ${compact ? "mx-auto h-12 w-12" : "h-full min-h-[144px] w-full"}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={imageAltText ?? name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#1bb7b5]/20" />
          <div className="absolute -bottom-3 left-2 h-10 w-10 rounded-full bg-[#f4c542]/30" />
          <div className="absolute inset-0 grid place-items-center p-3">
            <div className={`grid place-items-center rounded-full bg-white text-primary shadow-soft-saas ${compact ? "h-9 w-9 text-[11px]" : "h-20 w-20 text-lg"}`}>
              <span className="font-black">{initials || <Utensils className="h-5 w-5" aria-hidden="true" />}</span>
            </div>
          </div>
        </>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function OrderItemThumb({ item, name }: { item?: PublicQrMenuItem; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#dff5e8] via-white to-[#759b89] text-[#001c11]">
      {item?.imageUrl ? (
        <img src={item.imageUrl} alt={item.imageAltText ?? name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -right-4 -top-4 h-10 w-10 rounded-full bg-[#83fba5]/40" />
          <div className="absolute -bottom-3 left-1 h-8 w-8 rounded-full bg-[#006d36]/15" />
          <span className="relative text-sm font-black">{initials || <Utensils className="h-4 w-4" aria-hidden="true" />}</span>
        </>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function FoodPosterFallback({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#dff5e8] via-[#759b89] to-[#001c11]">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20" />
      <div className="absolute bottom-8 left-8 h-32 w-32 rounded-full bg-[#83fba5]/30" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white/80 text-[#001c11] shadow-modal">
          <Utensils className="h-12 w-12" aria-hidden="true" />
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

function getCartLineId(menuItemId: string, menuItemVariantId: string | null): string {
  return `${menuItemId}:${menuItemVariantId ?? "base"}`;
}

function getCartLinePrice(line: CartLine): number {
  return line.variant?.price ?? line.item.price;
}

function formatCartItemName(line: CartLine): string {
  return line.variant ? `${line.item.name} - ${line.variant.name}` : line.item.name;
}

function formatOrderItemName(itemName: string, variantName: string | null): string {
  return variantName ? `${itemName} - ${variantName}` : itemName;
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
