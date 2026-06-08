import { AlertCircle, Clock3 } from "lucide-react";
import { ApiError, getPublicQrMenu, getPublicQrOrder, type PublicQrMenu, type PublicQrOrder } from "../../../../../lib/api";
import { OrderTrackingClient } from "./order-tracking-client";

export const dynamic = "force-dynamic";

type OrderTrackingPageProps = {
  params: Promise<{
    qrToken: string;
    orderId: string;
  }>;
};

type OrderLoadResult =
  | {
      kind: "ready";
      menu: PublicQrMenu;
      order: PublicQrOrder;
    }
  | {
      kind: "not-found";
    }
  | {
      kind: "unavailable";
      message: string;
    };

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { qrToken, orderId } = await params;
  const result = await loadOrder(qrToken, orderId);

  if (result.kind === "not-found") {
    return <OrderUnavailable title="Order not found" message="This order link is invalid or no longer available for this QR table." />;
  }

  if (result.kind === "unavailable") {
    return <OrderUnavailable icon="clock" title="Order temporarily unavailable" message={result.message} />;
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-soft-saas">
        <OrderTrackingClient initialMenu={result.menu} initialOrder={result.order} orderId={orderId} qrToken={qrToken} />
      </section>
    </main>
  );
}

async function loadOrder(qrToken: string, orderId: string): Promise<OrderLoadResult> {
  try {
    const [menu, order] = await Promise.all([getPublicQrMenu(qrToken), getPublicQrOrder(qrToken, orderId)]);

    return {
      kind: "ready",
      menu,
      order
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

function OrderUnavailable({ icon = "alert", title, message }: { icon?: "alert" | "clock"; title: string; message: string }) {
  const Icon = icon === "clock" ? Clock3 : AlertCircle;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 text-ink">
      <section className="w-full max-w-sm border border-line bg-white p-5 text-center shadow-soft-saas">
        <Icon className="mx-auto h-10 w-10 text-soft-gold" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{message}</p>
      </section>
    </main>
  );
}
