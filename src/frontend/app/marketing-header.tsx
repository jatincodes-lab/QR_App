"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
      <nav
        className={[
          "mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full px-3 transition-all duration-300 sm:px-4",
          scrolled
            ? "border border-white/70 bg-white/86 shadow-[0_18px_48px_rgba(69,63,61,0.16)] backdrop-blur-xl"
            : "border border-transparent bg-white/0 shadow-none backdrop-blur-0"
        ].join(" ")}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full pr-3" aria-label="Qrave home">
          <span className="relative h-10 w-28 overflow-hidden">
            <img src="/brand/qrave-logo.png" alt="Qrave" className="absolute left-[-39px] top-[-39px] h-[118px] w-[118px] max-w-none object-contain sm:left-[-44px] sm:h-[128px] sm:w-[128px]" />
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-xl font-extrabold text-[#06633f]">rave</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 rounded-full bg-white/46 p-1 text-sm font-bold text-[#5f5b59] md:flex">
          <Link href="/#features" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#1a1615]">Features</Link>
          <Link href="/#benefits" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#1a1615]">Benefits</Link>
          <Link href="/#pricing" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#1a1615]">Pricing</Link>
          <Link href="/faq" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#1a1615]">FAQ</Link>
        </div>
        <Link href="/admin/register" className="rounded-full bg-[#1a1615] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#453f3d]">
          Start free
        </Link>
      </nav>
    </header>
  );
}
