import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "../components/header";
import ConditionalFooter from "../components/ConditionalFooter";
import { SpecProvider } from "../contexts/SpecContext";
import { AuthProvider } from "../contexts/AuthContext";
import { PathnameProvider } from "../contexts/PathnameContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
