import type { Metadata } from "next";
import Link from "next/link";
import { CheckList, PageShell, PricingBullets, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Pricing | Qrave QR Menu Software",
  description: "Simple pricing for Qrave, QR menu ordering and customer CRM software for restaurants, cafes, cloud kitchens, and food service teams.",
  alternates: { canonical: `${SiteUrl}/pricing` },
  openGraph: {
    title: "Qrave Pricing",
    description: "Start with QR menus, live orders, customer history, and WhatsApp-ready follow-up tools.",
    url: `${SiteUrl}/pricing`,
    siteName: "Qrave",
    type: "website"
  }
};

export default function PricingPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-extrabold uppercase text-secondary">Pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">Start simple, grow with your restaurant</h1>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Qrave is built for restaurants and cafes that want QR ordering first, then customer follow-up and repeat visit marketing.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-outline-variant bg-white p-6 shadow-soft-saas">
          <div className="flex flex-col gap-4 border-b border-outline-variant pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-primary">Restaurant Starter</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">For cafes, restaurants, and cloud kitchens launching QR menu ordering.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-extrabold text-primary">Start free</p>
              <p className="mt-1 text-sm text-on-surface-variant">Upgrade options can be added later.</p>
            </div>
          </div>
          <div className="mt-6">
            <CheckList items={PricingBullets} />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/admin/register" className="rounded-md bg-primary px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-primary-container">
              Start free
            </Link>
            <Link href="/contact" className="rounded-md border border-outline-variant bg-white px-5 py-3 text-center text-sm font-extrabold text-primary hover:bg-secondary-container">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
