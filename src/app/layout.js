import {
  Bricolage_Grotesque,
  Geist_Mono,
  Libre_Caslon_Text,
} from "next/font/google";
import "./globals.css";

import ConditionalFooter from "../components/ConditionalFooter";
import Header from "../components/header";
import { AuthProvider } from "../contexts/AuthContext";
import { PathnameProvider } from "../contexts/PathnameContext";
import { SpecProvider } from "../contexts/SpecContext";

// Interface face: a grotesque with actual character (ink traps, quirky
// terminals) — never the system-default look.
const bricolage = Bricolage_Grotesque({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif for the atelier identity (.viz-serif) — shared by the
// header wordmark, footer, and the visualizer's promise moments.
const caslon = Libre_Caslon_Text({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-caslon",
});

export const metadata = {
  title: "DSource — AI Interior Materials Marketplace",
  description:
    "Browse interior materials, match them from a room photo with AI, visualize swaps, and build product specs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${geistMono.variable} ${caslon.variable} antialiased`}
      >
        <PathnameProvider>
          <AuthProvider>
            <SpecProvider>
              {/* No global gutter: sections bleed to the viewport edge and
                  every page owns its horizontal padding. */}
              <Header />
              <main className="relative z-0">{children}</main>
              <ConditionalFooter />
            </SpecProvider>
          </AuthProvider>
        </PathnameProvider>
      </body>
    </html>
  );
}
