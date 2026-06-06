import type { Metadata } from "next";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Privacy Policy | Qrave",
  description: "Qrave privacy policy for restaurant QR menu ordering and customer CRM software.",
  alternates: { canonical: `${SiteUrl}/privacy` }
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-primary">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">
          Qrave helps restaurants manage QR menus, orders, and customer follow-up. Restaurants should collect customer information only with proper consent and use WhatsApp messaging responsibly.
        </p>
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">
          This page is a placeholder for the full privacy policy and should be reviewed before public launch.
        </p>
      </section>
    </PageShell>
  );
}
