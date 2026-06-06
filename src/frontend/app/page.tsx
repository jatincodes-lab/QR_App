import type { Metadata } from "next";
import Link from "next/link";
import { CheckList, ClockNote, FaqItems, FeatureGrid, HeroCollage, HowItWorks, PageShell, SectionHeader, SiteUrl, TrustStrip, UseCases } from "./marketing";

export const metadata: Metadata = {
  title: "QR Menu Ordering Software for Restaurants and Cafes | Qrave",
  description: "Qrave is QR menu software for restaurants and cafes. Accept table orders, manage live menus, capture customer WhatsApp numbers, and bring guests back.",
  alternates: { canonical: SiteUrl },
  keywords: ["QR menu software", "restaurant QR ordering system", "digital menu for restaurants", "QR code menu for cafes", "restaurant customer CRM", "WhatsApp marketing for restaurants"],
  openGraph: {
    title: "Qrave | QR Menu Ordering for Restaurants and Cafes",
    description: "Create QR menus, accept table orders, manage customers, and send WhatsApp follow-ups from one simple restaurant platform.",
    url: SiteUrl,
    siteName: "Qrave",
    type: "website"
  }
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Qrave",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "QR menu ordering and customer CRM software for restaurants, cafes, cloud kitchens, and food service businesses.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Start free"
      },
      featureList: [
        "QR menu ordering",
        "Table ordering",
        "Live order management",
        "Customer CRM",
        "WhatsApp customer follow-up",
        "Restaurant reports"
      ]
    },
    {
      "@type": "FAQPage",
      mainEntity: FaqItems.slice(0, 4).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    }
  ]
};

export default function LandingPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <section className="relative overflow-hidden bg-[#080604]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,107,53,0.32),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,185,120,0.22),transparent_30%),linear-gradient(135deg,rgba(255,107,53,0.18),transparent_42%)]" />
        <div className="absolute left-0 top-24 h-48 w-48 rounded-full border border-white/10 opacity-35" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-[#ffb978]">
              QR menu + orders + repeat customers
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
              QR menu ordering for restaurants and cafes
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
              Qrave helps restaurants take QR orders, manage live menus, remember customers, and bring them back with WhatsApp messages.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/register" className="rounded-md bg-[#ff6b35] px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-[#ff7f4f]">
                Start free
              </Link>
              <Link href="/admin/login" className="rounded-md border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-white/10">
                View demo
              </Link>
            </div>
            <div className="mt-6 max-w-md">
              <ClockNote />
            </div>
          </div>
          <HeroCollage />
        </div>
      </section>

      <TrustStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why owners need it"
          title="Turn one-time QR orders into repeat customers"
          text="Paper menus, missed orders, and manual WhatsApp lists slow down growing restaurants. Qrave keeps the QR menu, order flow, customer history, and follow-up messages in one place."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["Menus are hard to update", "Busy hours create missed orders", "Customer numbers get lost", "Offers are sent without history"].map((problem) => (
            <div key={problem} className="rounded-lg border border-outline-variant bg-white p-5 text-sm font-bold text-on-surface shadow-soft-saas">
              {problem}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-[#0d0907]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase text-[#ffb978]">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Everything a restaurant needs after the QR scan</h2>
            <p className="mt-4 text-base leading-7 text-white/60">Qrave is built for practical restaurant workflows: update menus, accept table orders, track customers, and send simple follow-up messages.</p>
          </div>
          <div className="mt-10">
            <FeatureGrid />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-8">
        <div>
          <SectionHeader
            eyebrow="How it works"
            title="Simple enough for daily restaurant use"
            text="The setup is direct: create a menu, print table QR codes, and manage incoming orders from the admin panel."
          />
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-6 shadow-soft-saas">
          <ol className="grid gap-4">
            {HowItWorks.map((step, index) => (
              <li key={step} className="flex items-center gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary-container text-sm font-extrabold text-primary">{index + 1}</span>
                <span className="font-bold text-on-surface">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-primary text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1fr] lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase text-brand-lime">Use cases</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Made for food businesses that serve repeat guests</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {UseCases.map((useCase) => (
              <div key={useCase} className="rounded-lg border border-white/15 bg-white/10 p-4 text-sm font-extrabold">
                {useCase}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-extrabold uppercase text-secondary">QR menu software</p>
          <h2 className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">What is a QR menu ordering system?</h2>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            A QR menu ordering system lets restaurant guests scan a code, view a digital menu, and place an order from their phone. For owners, it reduces menu printing, keeps prices and availability current, and gives staff a clearer live order queue.
          </p>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Qrave adds customer CRM on top of QR ordering. When customers share WhatsApp consent, restaurants can understand repeat visits, favorite items, and customer value, then send simple follow-up messages.
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-white p-6 shadow-soft-saas">
          <CheckList items={["Digital menu for restaurants and cafes", "QR code menu for table ordering", "Restaurant customer CRM", "WhatsApp marketing for restaurants", "Branch-wise reports and customer history"]} />
        </div>
      </section>

      <section className="bg-surface-container-low">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title="Clear answers for restaurant teams"
            text="Short answers help owners, search engines, and AI assistants understand exactly where Qrave fits."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {FaqItems.slice(0, 4).map((item) => (
              <article key={item.question} className="rounded-lg border border-outline-variant bg-white p-5 shadow-soft-saas">
                <h3 className="text-base font-extrabold text-on-surface">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-primary md:text-4xl">Ready to turn QR orders into repeat customers?</h2>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Start with your menu and table QR codes. Add customer follow-up as your restaurant grows.
          </p>
          <div className="mt-8">
            <Link href="/admin/register" className="rounded-md bg-primary px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-container">
              Start free
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
