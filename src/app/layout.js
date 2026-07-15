import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import ConditionalFooter from "../components/ConditionalFooter";
import Header from "../components/header";
import { AuthProvider } from "../contexts/AuthContext";
import { PathnameProvider } from "../contexts/PathnameContext";
import { SpecProvider } from "../contexts/SpecContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// NOTE: Set NEXT_PUBLIC_SITE_URL to the production origin (e.g. https://dsource.ai)
// in the prod environment so metadataBase, OpenGraph, and canonical URLs resolve
// correctly. Config/.env is owned by another branch — do not add it here.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dsource.ai";

const siteTitle = "DSource — AI Interior Materials Marketplace";
const siteDescription =
  "Browse interior materials, match them from a room photo with AI, visualize swaps, and build product specs.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "interior materials",
    "AI interior design",
    "material sourcing",
    "room photo matching",
    "interior visualizer",
    "product specifications",
    "materials marketplace",
    "designers",
    "architects",
    "DSource",
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: "DSource.AI",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PathnameProvider>
          <AuthProvider>
            <SpecProvider>
              <div className="max-w-[1728px] mx-auto px-2 sm:px-4">
                <Header />
                <main className="relative z-0">{children}</main>
                <ConditionalFooter />
              </div>
            </SpecProvider>
          </AuthProvider>
        </PathnameProvider>
      </body>
    </html>
  );
}
