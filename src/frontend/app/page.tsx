import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, Check, ChefHat, MessageCircle, QrCode, ScanLine, Users } from "lucide-react";
import { FaqItems, PageShell, SiteUrl } from "./marketing";

export const metadata: Metadata = {
  title: "QR Menu Ordering Software for Restaurants and Cafes | Qrave",
  description: "Qrave is QR menu ordering, live restaurant operations, customer CRM, and WhatsApp follow-up software for restaurants and cafes.",
  alternates: { canonical: SiteUrl },
  keywords: ["QR menu software", "restaurant QR ordering system", "digital menu for restaurants", "QR code menu for cafes", "restaurant customer CRM", "WhatsApp marketing for restaurants"],
  openGraph: {
    title: "Qrave | QR Menu Ordering for Restaurants and Cafes",
    description: "Create QR menus, accept table orders, manage customers, and send WhatsApp follow-ups from one restaurant platform.",
    url: SiteUrl,
    siteName: "Qrave",
    type: "website"
  }
};

const HeroTablet = "/dreelio/framerusercontent.com/images/pfcMvn2yqXD2Cl6VWthMkHlhaKQ8103.png";
const PhoneMockup = "/dreelio/framerusercontent.com/images/W508S15xkXJdvalNWW9jYJSIKgd15f.png";
const CardMockupOne = "/dreelio/framerusercontent.com/images/qazH0744I2w9AnpfmUJIze7ga7f4.png";
const CardMockupTwo = "/dreelio/framerusercontent.com/images/gxb6A1j9Y0wXrhIBrMQD21JI8079.png";
const ShowcaseImageOne = "/dreelio/framerusercontent.com/images/aGBXbEUV3YmIGpCQ2Kl05uxyM78ad.jpg";
const ShowcaseImageTwo = "/dreelio/framerusercontent.com/images/bzl9vAWsj1kC8ho9yBMW8p4Y85287.jpg";

const features = [
  {
    title: "QR menu that sells",
    text: "Show food photos, offers, categories, add-to-cart actions, and waiter calls in a mobile-first menu.",
    icon: ScanLine
  },
  {
    title: "Live order board",
    text: "New table orders, kitchen status, waiter calls, and staff notifications stay in one workspace.",
    icon: BellRing
  },
  {
    title: "Customer CRM",
    text: "Save WhatsApp consent, visit history, favorite items, spend, and repeat-customer signals.",
    icon: Users
  },
  {
    title: "Branch analytics",
    text: "Track value, status mix, kitchen pressure, menu count, setup coverage, and daily performance.",
    icon: BarChart3
  }
];

const benefits = [
  "No customer app needed",
  "Menu changes go live instantly",
  "Staff see orders and waiter calls",
  "Customer history grows automatically",
  "WhatsApp-ready repeat visit campaigns",
  "Works for cafes, restaurants, QSR, and cloud kitchens"
];

const reviews = [
  {
    quote: "Qrave gave our cafe a clean QR menu and made table orders easier for the staff.",
    name: "Aarav Mehta",
    role: "Cafe owner"
  },
  {
    quote: "The live order board and waiter-call flow helped us reduce confusion during rush hours.",
    name: "Riya Sharma",
    role: "Restaurant manager"
  },
  {
    quote: "We finally know who our repeat customers are and what offers to send them.",
    name: "Kabir Sethi",
    role: "Cloud kitchen lead"
  },
  {
    quote: "It looks premium for guests but still feels practical for restaurant operations.",
    name: "Naina Rao",
    role: "QSR operator"
  }
];

const softwareSchema = {
  "@context": "https://schema.org",
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
  }
};

export default function LandingPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      <section className="relative overflow-hidden bg-[#9fc3e6] pt-28">
        <div className="absolute inset-0 bg-[linear-gradient(#fafafa_0%,#f9f8f8_34%,#f4f1ee_48%,#e2ecf5_76%,#9fc3e6_120%)]" />
        <SidePreview position="left" />
        <SidePreview position="right" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 sm:px-6 lg:px-8">
          <div className="landing-reveal mx-auto flex max-w-5xl flex-col items-center text-center">
            <div className="rounded-full border border-[#e4e2e2] bg-white/54 px-4 py-2 text-sm font-extrabold text-[#614a44] backdrop-blur">
              QR menu + live orders + customer CRM
            </div>
            <h1 className="mt-8 text-[3.5rem] font-extrabold leading-[0.94] text-[#1a1615] sm:text-[5.4rem] lg:text-[7.25rem]">
              Turn QR scans into repeat guests
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-[#453f3d]">
              Qrave helps restaurants launch a beautiful digital menu, take table orders, manage service, and bring customers back with smarter follow-up.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1615] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#453f3d]">
                Start free <ArrowRight size={17} />
              </Link>
              <Link href="/admin/login" className="inline-flex items-center justify-center rounded-full border border-[#e4e2e2] bg-white/58 px-6 py-3 text-sm font-extrabold text-[#1a1615] backdrop-blur transition hover:bg-white">
                View demo
              </Link>
            </div>
          </div>

          <div className="landing-float relative mt-16 w-full max-w-[1072px]">
            <div className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/45 p-2 shadow-[0_28px_90px_rgba(69,63,61,0.18)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[1.8rem] bg-[#f9f8f8]">
                <img src={HeroTablet} alt="Tablet mockup showing restaurant operations dashboard" className="h-auto w-full" />
                <div className="absolute left-6 top-6 hidden max-w-sm rounded-[1.35rem] border border-white/70 bg-white/82 p-5 shadow-[0_20px_48px_rgba(69,63,61,0.16)] backdrop-blur md:block">
                  <p className="text-xs font-extrabold uppercase text-[#156cc2]">Qrave workspace</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#1a1615]">Orders, menus, tables, and customers</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#757170]">Replace this mockup later with final Qrave product renders.</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-8 left-4 hidden w-64 rounded-[1.5rem] border border-white/70 bg-white/86 p-4 shadow-[0_18px_42px_rgba(69,63,61,0.16)] backdrop-blur md:block">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e2ecf5] text-[#156cc2]">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#1a1615]">24 table QR codes</p>
                  <p className="text-xs font-bold text-[#757170]">Ready for print</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 -top-8 hidden w-72 rounded-[1.5rem] border border-white/70 bg-white/86 p-4 shadow-[0_18px_42px_rgba(69,63,61,0.16)] backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#eddfd0] text-[#754d29]">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#1a1615]">184 repeat guests</p>
                  <p className="text-xs font-bold text-[#757170]">WhatsApp follow-up ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#9fc3e6] py-3">
        <div className="landing-marquee flex gap-4">
          {[...reviews, ...reviews].map((review, index) => (
            <article key={`${review.name}-${index}`} className="w-[22rem] shrink-0 rounded-[1.5rem] bg-white/70 p-5 shadow-soft-saas backdrop-blur">
              <p className="text-sm font-semibold leading-6 text-[#453f3d]">"{review.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#1a1615] text-sm font-extrabold text-white">{review.name.slice(0, 1)}</div>
                <div>
                  <p className="text-sm font-extrabold text-[#1a1615]">{review.name}</p>
                  <p className="text-xs font-bold text-[#757170]">{review.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="bg-[#f4f1ee] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <LandingSectionHeader eyebrow="Features" title="Everything a restaurant needs after the QR scan" text="The Dreelio-style layout stays, but the product story is built around Qrave's restaurant workflow." />
          <div className="mt-12 grid gap-6">
            <FeatureShowcase
              eyebrow="Customer menu"
              title="A polished mobile menu for every table"
              text="Guests scan, see offers, browse food photos, add items, and request staff from a menu that feels designed rather than printed."
              image={ShowcaseImageOne}
              icon={ScanLine}
            />
            <FeatureShowcase
              eyebrow="Restaurant operations"
              title="Live orders, waiter calls, and branch control"
              text="Staff can track what just came in, what needs preparation, and which customers are ready for follow-up after service."
              image={ShowcaseImageTwo}
              icon={BellRing}
              reverse
            />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <CompactFeature key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="bg-[#eddfd0] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#754d29]">Benefits</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight text-[#1a1615] md:text-6xl">Give owners a control room, not another spreadsheet</h2>
            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-[#614a44]">
              Orders, waiter calls, menu health, customer history, and branch analytics stay connected in one restaurant workspace.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/58 px-4 py-3 text-sm font-extrabold text-[#1a1615]">
                  <Check size={17} className="text-[#0ea158]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/48 p-3 shadow-[0_24px_80px_rgba(117,77,41,0.18)]">
            <img src={PhoneMockup} alt="Phone mockup for QR menu ordering" className="h-auto w-full rounded-[1.5rem]" />
          </div>
        </div>
      </section>

      <section className="bg-[#e2ecf5] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="grid gap-5 md:grid-cols-2">
            <ImageCard image={CardMockupOne} label="Menu setup" title="Create menus and offers" />
            <ImageCard image={CardMockupTwo} label="Live service" title="Manage orders and guests" />
          </div>
          <div>
            <p className="text-sm font-extrabold uppercase text-[#156cc2]">How it works</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight text-[#1a1615] md:text-6xl">Print once, update every service</h2>
            <p className="mt-6 text-base font-medium leading-8 text-[#453f3d]">
              Table QR cards stay in the restaurant. Your menu, offers, availability, order flow, and customer records update whenever your team needs.
            </p>
            <div className="mt-8 grid gap-3">
              {["Create branch and menu", "Print table QR cards", "Guests scan and order", "Track customers and reports"].map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl bg-white/72 p-4 text-sm font-extrabold text-[#1a1615]">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#156cc2] text-white">{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f9f8f8] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#1a1615] p-8 text-white shadow-[0_24px_80px_rgba(26,22,21,0.24)] md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_0.82fr] md:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase text-[#9fc3e6]">Start free</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">Launch the first table QR today</h2>
              <p className="mt-6 text-base font-medium leading-8 text-white/68">Start with menu and QR ordering. Add customer follow-up and analytics as your restaurant grows.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5 text-[#1a1615]">
              {["Digital QR menu", "Live orders and waiter calls", "Branch analytics", "Customer CRM"].map((item) => (
                <div key={item} className="flex items-center gap-3 border-b border-[#e4e2e2] py-3 text-sm font-extrabold last:border-b-0">
                  <Check size={17} className="text-[#0ea158]" />
                  {item}
                </div>
              ))}
              <Link href="/admin/register" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#9fc3e6] px-5 py-3 text-sm font-extrabold text-[#1a1615] hover:bg-[#e2ecf5]">
                Create account <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LandingSectionHeader eyebrow="FAQ" title="Questions restaurant teams ask" text="Short answers for owners deciding whether QR ordering fits their restaurant." />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {FaqItems.slice(0, 4).map((item) => (
              <article key={item.question} className="rounded-[1.5rem] border border-[#e4e2e2] bg-[#f9f8f8] p-6">
                <h3 className="text-lg font-extrabold text-[#1a1615]">{item.question}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#757170]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function SidePreview({ position }: { position: "left" | "right" }) {
  const left = position === "left";
  return (
    <div className={`landing-float absolute top-44 hidden w-[30rem] rounded-[2rem] border border-white/60 bg-white/36 p-5 shadow-[0_24px_80px_rgba(69,63,61,0.12)] backdrop-blur lg:block ${left ? "-left-80 rotate-[-8deg]" : "-right-80 rotate-[8deg]"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-[#453f3d]">{left ? "Live orders" : "Customer CRM"}</p>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-[#1a1615]">Qrave</span>
      </div>
      <p className="mt-8 text-7xl font-extrabold leading-none text-[#1a1615]">{left ? "36" : "184"}</p>
      <p className="mt-3 text-sm font-bold text-[#757170]">{left ? "orders handled today" : "repeat guests saved"}</p>
      <div className="mt-6 h-3 rounded-full bg-white/54">
        <div className={`h-3 rounded-full ${left ? "w-3/5 bg-[#156cc2]" : "w-4/5 bg-[#0ea158]"}`} />
      </div>
    </div>
  );
}

function ImageCard({ image, label, title }: { image: string; label: string; title: string }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/58 p-3 shadow-soft-saas">
      <img src={image} alt="" className="h-64 w-full rounded-[1.25rem] object-cover" />
      <div className="p-3">
        <p className="text-xs font-extrabold uppercase text-[#156cc2]">{label}</p>
        <h3 className="mt-2 text-xl font-extrabold text-[#1a1615]">{title}</h3>
      </div>
    </article>
  );
}

function FeatureShowcase({
  eyebrow,
  icon: Icon,
  image,
  reverse = false,
  text,
  title
}: {
  eyebrow: string;
  icon: typeof ScanLine;
  image: string;
  reverse?: boolean;
  text: string;
  title: string;
}) {
  return (
    <article className={`landing-rise grid overflow-hidden rounded-[2rem] border border-white/70 bg-white/62 p-2 shadow-[0_24px_72px_rgba(69,63,61,0.12)] md:grid-cols-2 ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}>
      <div className="relative min-h-[22rem] overflow-hidden rounded-[1.5rem] bg-[#e2ecf5]">
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,22,21,0),rgba(26,22,21,0.32))]" />
      </div>
      <div className="flex min-h-[22rem] flex-col justify-between p-6 md:p-9">
        <div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e2ecf5] text-[#156cc2]">
            <Icon size={22} />
          </div>
          <p className="mt-8 text-sm font-extrabold uppercase text-[#156cc2]">{eyebrow}</p>
          <h3 className="mt-3 text-3xl font-extrabold leading-tight text-[#1a1615] md:text-5xl">{title}</h3>
          <p className="mt-5 max-w-lg text-base font-medium leading-8 text-[#757170]">{text}</p>
        </div>
        <Link href="/admin/register" className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#1a1615] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#453f3d]">
          Try this workflow <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

function CompactFeature({ icon: Icon, text, title }: { icon: typeof ScanLine; text: string; title: string }) {
  return (
    <article className="landing-rise rounded-[1.75rem] border border-[#e4e2e2] bg-white p-6 shadow-soft-saas">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e2ecf5] text-[#156cc2]">
        <Icon size={22} />
      </div>
      <h3 className="mt-6 text-xl font-extrabold text-[#1a1615]">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-[#757170]">{text}</p>
    </article>
  );
}

function LandingSectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-sm font-extrabold uppercase text-[#156cc2]">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-extrabold leading-tight text-[#1a1615] md:text-6xl">{title}</h2>
      <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-[#757170]">{text}</p>
    </div>
  );
}
