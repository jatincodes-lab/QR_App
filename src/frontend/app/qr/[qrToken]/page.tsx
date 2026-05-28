import { AlertCircle, ArrowLeft, Clock3, ReceiptText, ShoppingCart } from "lucide-react";
import { ApiError, getPublicQrMenu, type PublicQrMenu } from "../../../lib/api";
import { QrMenuClient } from "./qr-menu-client";

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
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-soft-saas">
        <header className="sticky top-0 z-20 border-b border-line bg-white px-4 py-3">
          <div className="grid h-10 grid-cols-[40px_1fr_40px] items-center">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center text-ink"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 text-center">
              <h1 className="truncate text-[15px] font-extrabold uppercase tracking-normal">{menu.branchName}</h1>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-on-surface-variant">{menu.tableName}</p>
            </div>
            <div className="relative grid h-10 w-10 place-items-center text-ink" aria-label={`${itemCount} items`}>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-secondary-container px-1 text-[10px] font-extrabold leading-none text-on-secondary-container">
                {itemCount}
              </span>
            </div>
          </div>
        </header>

        {hasItems ? (
          <QrMenuClient menu={menu} />
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
