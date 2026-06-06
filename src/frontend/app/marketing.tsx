import Link from "next/link";
import { BarChart3, Check, ChefHat, Clock3, MessageCircle, QrCode, ScanLine, ShieldCheck, Smartphone, Store, Users } from "lucide-react";

export const SiteUrl = "https://qrave.app";

export const Features = [
  {
    title: "QR menu ordering",
    text: "Customers scan, browse your live menu, and place table orders from their phone.",
    icon: QrCode
  },
  {
    title: "Live order flow",
    text: "Staff can see new orders, update kitchen status, and keep service moving during busy hours.",
    icon: ChefHat
  },
  {
    title: "Customer list",
    text: "Qrave remembers customers, visits, total spend, favorite items, and last order activity.",
    icon: Users
  },
  {
    title: "WhatsApp follow-up",
    text: "Message opted-in customers with repeat visit reminders, offers, and favorite item prompts.",
    icon: MessageCircle
  },
  {
    title: "Branch-wise control",
    text: "Manage menus, tables, QR codes, reports, and customer data for each restaurant branch.",
    icon: Store
  },
  {
    title: "Simple reports",
    text: "Track orders, repeat customers, customer value, and menu performance without spreadsheets.",
    icon: BarChart3
  }
];

export const FaqItems = [
  {
    question: "What is Qrave?",
    answer: "Qrave is QR menu software for restaurants and cafes. It helps owners create digital menus, accept table orders, manage live orders, capture customer WhatsApp numbers, and bring customers back with simple marketing messages."
  },
  {
    question: "Is Qrave a QR menu ordering system?",
    answer: "Yes. Qrave lets restaurants print QR codes for tables so customers can scan, view the menu, and place orders from their own phone."
  },
  {
    question: "Do customers need to install an app?",
    answer: "No. Customers open the QR menu in their browser after scanning the table QR code."
  },
  {
    question: "Can Qrave help with WhatsApp marketing?",
    answer: "Yes. Qrave can save opted-in customer WhatsApp numbers and help restaurant teams send simple follow-up messages for offers and repeat visits."
  },
  {
    question: "Can I manage multiple branches?",
    answer: "Yes. Qrave is designed for branch-wise menus, tables, orders, customers, and reports."
  },
  {
    question: "Can I update menu items anytime?",
    answer: "Yes. Restaurant teams can update item names, prices, availability, images, offers, and table QR settings from the admin panel."
  },
  {
    question: "Is Qrave useful for cafes and cloud kitchens?",
    answer: "Yes. Qrave works for restaurants, cafes, cloud kitchens, quick-service restaurants, food courts, and hotel restaurants."
  }
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/70 bg-surface/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Qrave home">
          <QraveMark />
          <span className="text-2xl font-extrabold tracking-normal text-primary">Qrave</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-on-surface-variant md:flex">
          <Link href="/#features" className="hover:text-primary">Features</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
          <Link href="/faq" className="hover:text-primary">FAQ</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
        </div>
        <Link href="/admin/register" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-container">
          Start free
        </Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-outline-variant/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <QraveMark />
            <span className="text-2xl font-extrabold tracking-normal text-primary">Qrave</span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
            QR menu ordering and customer follow-up software for restaurants, cafes, cloud kitchens, and quick-service teams.
          </p>
        </div>
        <div>
          <p className="text-sm font-extrabold text-on-surface">Product</p>
          <div className="mt-3 grid gap-2 text-sm text-on-surface-variant">
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-extrabold text-on-surface">Company</p>
          <div className="mt-3 grid gap-2 text-sm text-on-surface-variant">
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function QraveMark() {
  return (
    <svg className="h-11 w-11 shrink-0" viewBox="0 0 120 120" role="img" aria-label="Qrave logo mark" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 82c16 11 41 12 60 1" stroke="#ffb978" strokeWidth="8" strokeLinecap="round" />
      <circle cx="55" cy="52" r="42" stroke="#006241" strokeWidth="9" />
      <circle cx="55" cy="52" r="28" stroke="#006241" strokeWidth="9" />
      <path d="M54 24c-14 2-25 14-25 29 0 9 4 18 11 23" stroke="#ffffff" strokeWidth="13" strokeLinecap="round" />
      <path d="M46 56l45 45c6 6 17 6 23 0L67 54" stroke="#006241" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 42l28 28" stroke="#006241" strokeWidth="8" strokeLinecap="round" />
      <path d="M55 35l28 28" stroke="#006241" strokeWidth="8" strokeLinecap="round" />
      <path d="M67 28l28 28" stroke="#006241" strokeWidth="8" strokeLinecap="round" />
      <path d="M35 40c3-10 12-17 23-17 9 0 17 5 21 12" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export function ProductVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-soft-saas">
        <div className="flex items-center justify-between border-b border-outline-variant/70 pb-3">
          <div>
            <p className="text-xs font-bold uppercase text-on-surface-variant">Live orders</p>
            <p className="mt-1 text-lg font-extrabold text-primary">Table service dashboard</p>
          </div>
          <span className="rounded-md bg-secondary-container px-3 py-1 text-xs font-extrabold text-on-secondary-container">12 active</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.82fr]">
          <div className="grid gap-3">
            {["Table 4", "Table 8", "Pickup"].map((table, index) => (
              <div key={table} className="rounded-lg border border-outline-variant/70 bg-surface-container-low p-3">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-on-surface">{table}</p>
                  <span className="text-xs font-bold text-primary">{index === 0 ? "Preparing" : index === 1 ? "New" : "Ready"}</span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">{index === 0 ? "2 masala dosa, 1 cold coffee" : index === 1 ? "Paneer wrap, fries" : "Veg burger combo"}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-primary p-4 text-white">
            <div className="mx-auto grid h-28 w-28 grid-cols-5 gap-1 rounded-md bg-white p-2">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} className={index % 3 === 0 || index === 6 || index === 18 ? "rounded-[2px] bg-primary" : "rounded-[2px] bg-surface-container"} />
              ))}
            </div>
            <p className="mt-4 text-center text-sm font-bold">Scan. Order. Return.</p>
            <div className="mt-4 rounded-md bg-white/10 p-3">
              <p className="text-xs text-white/75">Customer saved</p>
              <p className="mt-1 text-sm font-bold">Priya · 4 visits · WhatsApp opt-in</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-6 hidden rounded-lg border border-outline-variant bg-white px-4 py-3 shadow-soft-saas sm:block">
        <div className="flex items-center gap-2 text-sm font-bold text-primary">
          <MessageCircle size={16} />
          Come back offer ready
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, text }: { eyebrow?: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="text-sm font-extrabold uppercase text-secondary">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-on-surface-variant">{text}</p>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Features.map((feature) => {
        const Icon = feature.icon;
        return (
          <article key={feature.title} className="rounded-lg border border-outline-variant bg-white p-5 shadow-soft-saas">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary-container text-primary">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-on-surface">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{feature.text}</p>
          </article>
        );
      })}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-on-surface-variant">
          <Check className="mt-0.5 shrink-0 text-secondary" size={18} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y border-outline-variant/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <ScanLine className="text-secondary" size={20} />
          Built for table QR ordering
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <Smartphone className="text-secondary" size={20} />
          No customer app needed
        </div>
        <div className="flex items-center gap-3 text-sm font-bold text-on-surface">
          <ShieldCheck className="text-secondary" size={20} />
          Consent-first WhatsApp follow-up
        </div>
      </div>
    </section>
  );
}

export const UseCases = ["Restaurants", "Cafes", "Cloud kitchens", "Food courts", "QSR brands", "Hotel restaurants"];
export const HowItWorks = ["Create your menu", "Print QR codes for tables", "Customers scan and order", "Staff manage live orders", "Qrave saves customers for repeat visits"];
export const PricingBullets = ["Digital QR menu and table QR codes", "Live orders and kitchen status", "Customer list with visit and spend history", "WhatsApp-ready customer follow-up", "Branch-wise menu, table, and report management"];

export function ClockNote() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface-variant">
      <Clock3 size={16} className="text-secondary" />
      Launch with a simple setup, improve every week.
    </div>
  );
}
