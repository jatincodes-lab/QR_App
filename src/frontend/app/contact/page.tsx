import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Contact | Qrave",
  description: "Contact Qrave for QR menu ordering, digital menus, restaurant customer CRM, and WhatsApp follow-up software.",
  alternates: { canonical: `${SiteUrl}/contact` },
  openGraph: {
    title: "Contact Qrave",
    description: "Talk to Qrave about QR menu software for your restaurant, cafe, cloud kitchen, or food service business.",
    url: `${SiteUrl}/contact`,
    siteName: "Qrave",
    type: "website"
  }
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-extrabold uppercase text-secondary">Contact</p>
          <h1 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">Bring QR ordering to your restaurant</h1>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Tell us about your restaurant, cafe, cloud kitchen, or multi-branch food business. We can help you plan QR menus, table ordering, and customer follow-up.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-on-surface-variant">
            <p><strong className="text-on-surface">Best for:</strong> restaurants, cafes, cloud kitchens, QSR teams, and food courts.</p>
            <p><strong className="text-on-surface">Use cases:</strong> QR menu setup, live ordering, customer list, WhatsApp follow-up, and branch reporting.</p>
          </div>
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-6 shadow-soft-saas">
          <h2 className="text-2xl font-extrabold text-primary">Start the conversation</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            The fastest way to test Qrave is to create an account and add one branch, one menu, and one table QR code.
          </p>
          <div className="mt-6 grid gap-3">
            <Link href="/admin/register" className="rounded-md bg-primary px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-primary-container">
              Start free
            </Link>
            <a href="mailto:hello@qrave.app" className="rounded-md border border-outline-variant bg-white px-5 py-3 text-center text-sm font-extrabold text-primary hover:bg-secondary-container">
              hello@qrave.app
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
