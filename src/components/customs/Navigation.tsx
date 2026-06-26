"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <div className="sticky top-3.5 z-40 mt-3.5 px-4">
      <header className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between rounded-full border border-[var(--color-line)] bg-white/[0.78] pl-[18px] pr-3 shadow-[var(--shadow-card)] backdrop-blur-xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-[11px]">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-sky shadow-[0_6px_16px_rgba(99,102,241,0.35)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="9" width="20" height="6" rx="1.5" fill="#fff" opacity="0.95" />
              <line x1="7" y1="9" x2="7" y2="15" stroke="#6366f1" strokeWidth="1.6" />
              <line x1="12" y1="9" x2="12" y2="15" stroke="#6366f1" strokeWidth="1.6" />
              <line x1="16.5" y1="9" x2="16.5" y2="15" stroke="#6366f1" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-extrabold tracking-[-0.03em] text-ink">Optikerf</span>
            <span className="mt-0.5 font-mono text-[8.5px] font-bold tracking-[0.22em] text-accent">CUTTING&nbsp;STOCK</span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1.5">
          {links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-[14px] py-2 font-body text-[13.5px] font-semibold transition-colors ${
                  isActive
                    ? "bg-accent/[0.07] text-ink"
                    : "text-ink-2 hover:bg-accent/[0.07] hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/projects"
            className="ml-1.5 flex items-center gap-[7px] rounded-full bg-accent px-4 py-[9px] pl-[14px] font-body text-[13.5px] font-bold text-white shadow-[0_6px_18px_rgba(99,102,241,0.32)] transition-all hover:-translate-y-px hover:bg-accent-deep"
          >
            <IconPlus className="h-[15px] w-[15px]" stroke={2.2} />
            New Project
          </Link>
        </div>
      </header>
    </div>
  );
}
