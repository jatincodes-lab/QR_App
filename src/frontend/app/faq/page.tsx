import type { Metadata } from "next";
import { FaqItems, PageShell, SiteUrl } from "../marketing";

export const metadata: Metadata = {
  title: "FAQ | Qrave QR Menu Ordering Software",
  description: "Answers about Qrave QR menu software, table ordering, WhatsApp follow-up, customer CRM, branches, and restaurant use cases.",
  alternates: { canonical: `${SiteUrl}/faq` },
  openGraph: {
    title: "Qrave FAQ",
    description: "Common questions about QR menu ordering, restaurant customer CRM, and WhatsApp follow-up with Qrave.",
    url: `${SiteUrl}/faq`,
    siteName: "Qrave",
    type: "website"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FaqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }))
};

export default function FaqPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase text-secondary">FAQ</p>
          <h1 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">Questions restaurant owners ask</h1>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Clear answers about QR menu ordering, customer capture, WhatsApp messaging, and branch management.
          </p>
        </div>
        <div className="mt-10 grid gap-4">
          {FaqItems.map((item) => (
            <article key={item.question} className="rounded-lg border border-outline-variant bg-white p-5 shadow-soft-saas">
              <h2 className="text-lg font-extrabold text-on-surface">{item.question}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
