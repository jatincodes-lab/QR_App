import { AlertCircle, Bell, CheckCircle2, ChefHat, Clock3, MapPin, ReceiptText, ShoppingBag } from "lucide-react";
import { ApiError, getPublicQrMenu, type PublicQrMenu, type PublicQrMenuCategory } from "../../../lib/api";

export const dynamic = "force-dynamic";

type QrMenuPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

type MenuLoadResult =
  | {
      kind: "ready";
      menu: PublicQrMenu;
    }
  | {
      kind: "not-found";
    }
  | {
      kind: "unavailable";
      message: string;
    };

export default async function QrMenuPage({ params }: QrMenuPageProps) {
  const { qrToken } = await params;
  const result = await loadMenu(qrToken);

  if (result.kind === "not-found") {
    return <QrMenuUnavailable />;
  }

  if (result.kind === "unavailable") {
    return <QrMenuTemporarilyUnavailable message={result.message} />;
  }

  const menu = result.menu;
  const categories = [...menu.categories].sort((left, right) => left.displayOrder - right.displayOrder);
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
  const hasItems = itemCount > 0;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <header className="bg-primary px-4 pb-5 pt-4 text-on-primary sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary-fixed">
                <ChefHat className="h-4 w-4" aria-hidden="true" />
                Qrave Menu
              </p>
              <h1 className="mt-3 break-words text-3xl font-bold leading-9">{menu.branchName}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-primary-fixed-dim">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{menu.tableName}</span>
              </p>
            </div>

            <div className="shrink-0 rounded border border-white/15 bg-white/10 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-fixed-dim">Items</p>
              <p className="mt-1 text-2xl font-bold">{itemCount}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <StatusPill
              icon={menu.orderSettings.enableDirectQrOrdering ? ShoppingBag : ReceiptText}
              title={menu.orderSettings.enableDirectQrOrdering ? "Direct ordering on" : "Browse-only menu"}
              tone={menu.orderSettings.enableDirectQrOrdering ? "success" : "neutral"}
            />
            <StatusPill
              icon={menu.orderSettings.waiterCallEnabled ? Bell : Clock3}
              title={menu.orderSettings.waiterCallEnabled ? "Waiter call available" : "Ask staff to order"}
              tone={menu.orderSettings.waiterCallEnabled ? "success" : "neutral"}
            />
          </div>
        </header>

        {hasItems ? (
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

            <div className="flex-1 px-4 py-4 sm:px-6">
              <div className="space-y-5">
                {categories.map((category) => (
                  <MenuCategorySection key={category.menuCategoryId} category={category} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <EmptyMenu branchName={menu.branchName} />
        )}
      </section>
    </main>
  );
}

async function loadMenu(qrToken: string): Promise<MenuLoadResult> {
  try {
    return {
      kind: "ready",
      menu: await getPublicQrMenu(qrToken)
    };
  } catch (caught) {
    if (caught instanceof ApiError) {
      if (caught.status === 404) {
        return {
          kind: "not-found"
        };
      }

      return {
        kind: "unavailable",
        message: caught.message
      };
    }

    throw caught;
  }
}

function MenuCategorySection({ category }: { category: PublicQrMenuCategory }) {
  const items = [...category.items].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <section id={`category-${category.menuCategoryId}`} className="scroll-mt-20 border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-lg font-bold leading-7">{category.name}</h2>
      </div>

      <div className="divide-y divide-line">
        {items.map((item) => (
          <article key={item.menuItemId} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">
            <div className="min-w-0">
              <h3 className="break-words text-base font-semibold leading-6">{item.name}</h3>
              {item.description ? (
                <p className="mt-1 break-words text-sm leading-6 text-on-surface-variant">{item.description}</p>
              ) : null}
            </div>
            <p className="whitespace-nowrap text-sm font-bold text-primary">{formatPrice(item.price)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusPill({
  icon: Icon,
  title,
  tone
}: {
  icon: typeof CheckCircle2;
  title: string;
  tone: "success" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200/30 bg-emerald-400/15 text-emerald-50"
      : "border-white/15 bg-white/10 text-primary-fixed-dim";

  return (
    <div className={`flex min-h-12 items-center gap-3 rounded border px-3 py-2 ${toneClass}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

function EmptyMenu({ branchName }: { branchName: string }) {
  return (
    <div className="grid flex-1 place-items-center px-4 py-10 sm:px-6">
      <div className="w-full border border-line bg-white p-5 text-center shadow-soft-saas">
        <ReceiptText className="mx-auto h-9 w-9 text-soft-gold" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold">{branchName}</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">The menu is not available right now.</p>
      </div>
    </div>
  );
}

function QrMenuUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 text-ink">
      <section className="w-full max-w-sm border border-line bg-white p-5 text-center shadow-soft-saas">
        <AlertCircle className="mx-auto h-10 w-10 text-error" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">QR menu not found</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          This QR code is inactive or no longer belongs to an active table.
        </p>
      </section>
    </main>
  );
}

function QrMenuTemporarilyUnavailable({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 text-ink">
      <section className="w-full max-w-sm border border-line bg-white p-5 text-center shadow-soft-saas">
        <Clock3 className="mx-auto h-10 w-10 text-soft-gold" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">Menu temporarily unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{message}</p>
      </section>
    </main>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(price);
}
