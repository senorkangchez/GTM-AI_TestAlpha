import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getMeta } from "@/lib/store";

export const metadata: Metadata = {
  title: "GTM Signal Engine",
  description:
    "Turn field signals into golden data and route them — product, marketing, sales — automatically.",
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
              GTM Signal Engine
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/digest" className="hover:text-foreground">Digest</Link>
              <Link href="/action" className="hover:text-foreground">Fan-out</Link>
              <Link href="/heatmap" className="hover:text-foreground">Macro</Link>
              <Link href="/teams" className="hover:text-foreground">Teams</Link>
              <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
              <a href="/deck.html" target="_blank" rel="noopener" className="hover:text-foreground">Deck ↗</a>
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
            GTM Signal Engine · synthetic demo data · deterministic scoring & routing · read-only ·{" "}
            {meta.mode === "live" ? "live" : "mock"} extraction ({meta.signals} signals)
          </div>
        </footer>
      </body>
    </html>
  );
}
