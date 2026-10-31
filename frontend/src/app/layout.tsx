import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import BottomDock from "@/components/BottomDock";
import DemoBanner from "@/components/DemoBanner";
import SettingsSheet from "@/components/SettingsSheet";
import TopBar from "@/components/TopBar";
import "./globals.css";
import Providers from "./providers";

// Space Grotesk to krój zalecany w materiałach Solvro. latin-ext jest potrzebne dla polskich znaków (ą, ę, ł, ż...).
// Next pobiera go przy budowaniu i serwuje z własnej domeny, więc przeglądarka nie łączy się z Google.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Koktajle",
  description: "Przeglądaj przepisy na koktajle, szukaj i zapisuj ulubione.",
};

// viewport-fit=cover: strona sięga pod wcięcia i pasek gestów telefonu, a dolne paski same odsuwają się o env(safe-area-inset-bottom)
export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          Przejdź do treści
        </a>
        <Providers>
          {/* useSearchParams wymaga Suspense; zastępczy pasek ma tę samą wysokość, żeby strona nie skakała */}
          <Suspense fallback={<div className="glass sticky top-0 z-30 h-16 border-b border-current/15" aria-hidden="true" />}>
            <TopBar />
          </Suspense>
          <DemoBanner />
          {children}
          <BottomDock />
          <SettingsSheet />
        </Providers>
      </body>
    </html>
  );
}
