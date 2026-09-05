import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Background } from "@/components/Background";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
];

export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden text-moon">
      <Background />
      <div className="relative z-10 mx-auto w-full max-w-[900px] px-6 pb-20 pt-8 md:px-10 md:pt-12">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/[.06] pb-7">
          <Link href="/" className="legal-home-link">
            <ArrowLeft size={15} strokeWidth={1.4} aria-hidden="true" />
            <span>Midnight Tarot</span>
          </Link>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="legal-nav-link">{item.label}</Link>
            ))}
          </nav>
        </header>

        <article className="legal-manuscript">
          <div className="legal-heading">
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            <div aria-hidden="true" className="legal-sigil">✦</div>
            <p className="legal-intro">{intro}</p>
            <p className="legal-effective">Effective September 1, 2026</p>
          </div>
          <div className="legal-body">{children}</div>
        </article>

        <footer className="mt-16 border-t border-white/[.06] pt-7 text-center text-[10px] leading-6 tracking-[.11em] text-moon/40">
          Midnight Tarot is an independently operated reflective entertainment service.
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function SupportAddress() {
  if (!supportEmail) {
    return <strong>the support address published on our Support page</strong>;
  }
  return (
    <a href={`mailto:${supportEmail}`} className="legal-email">
      <Mail size={15} strokeWidth={1.4} aria-hidden="true" />
      {supportEmail}
    </a>
  );
}
