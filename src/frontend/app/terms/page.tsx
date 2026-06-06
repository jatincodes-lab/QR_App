import type { Metadata } from "next";
import { PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "Terms | Qrave",
  description: "Qrave terms for restaurant QR menu ordering and customer CRM software.",
  alternates: { canonical: `${SiteUrl}/terms` }
};

export default function TermsPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-primary">Terms</h1>
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">
          Qrave provides QR menu ordering and customer management tools for restaurants and cafes. Restaurant owners are responsible for menu accuracy, pricing, customer consent, and messaging practices.
        </p>
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">
          This page is a placeholder for the full terms and should be reviewed before public launch.
        </p>
      </section>
    </PageShell>
  );
}
