import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getMeta } from "@/lib/store";

export const metadata: Metadata = {
  title: "Field Intelligence System",
  description:
    "A system of intelligence beside the CRM — the field says what the record can't.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const meta = getMeta();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
              Field Intelligence
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/" className="hover:text-foreground">Territories</Link>
              <Link href="/routing" className="hover:text-foreground">Routing</Link>
              <Link href="/live" className="hover:text-foreground">Live extract</Link>
              <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
              <span
                title={`Extraction mode: ${meta.mode}`}
                className={
                  "rounded-full px-2 py-0.5 text-xs font-medium border " +
                  (meta.mode === "live"
                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300")
                }
              >
                extraction: {meta.mode}
              </span>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
        <footer className="border-t border-border text-xs text-muted">
          <div className="mx-auto max-w-6xl px-5 py-4">
            System of intelligence beside the CRM · synthetic demo data · deterministic scoring & routing ·{" "}
            {meta.mode === "live" ? "live" : "mock"} extraction ({meta.signals} signals)
          </div>
        </footer>
      </body>
    </html>
  );
}
