import "./global.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Fraunces, Nunito, JetBrains_Mono } from "next/font/google";
import StaticSearchDialog from "@/components/search-dialog";
import { site } from "@/lib/site";
import banner from "../../../banner.jpg";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  // "./" resolves against each page's own path (metadataBase + trailingSlash), so
  // every page gets its own canonical and og:url.
  alternates: { canonical: "./" },
  // No title/description here: Next fills og:* and twitter:* from each page's own
  // metadata. Pages must not set their own `openGraph`, which would drop `images`.
  openGraph: {
    url: "./",
    siteName: site.name,
    type: "website",
    images: [{
      url: new URL(banner.src, new URL(site.origin).origin).href,
      width: banner.width,
      height: banner.height,
      alt: "FluffBoost's gray-and-cream wolf at sunrise",
    }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        {/* preload: false keeps the (lazy) search dialog unmounted until it is first opened. */}
        <RootProvider search={{ SearchDialog: StaticSearchDialog, preload: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
