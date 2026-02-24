// src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Veil — Blind Connections",
  description: "One match. 22 hours. No photos. No bios.",
  themeColor: "#0A0A0F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-veil-black text-veil-text font-body antialiased">
        {/* Phone-frame wrapper */}
        <div className="min-h-screen flex items-center justify-center md:bg-[#06060A]">
          <div className="relative w-full max-w-sm mx-auto min-h-screen md:min-h-0 md:h-[812px] md:rounded-[48px] md:overflow-hidden md:shadow-[0_0_80px_rgba(200,169,110,0.12)] bg-veil-black">
            <Providers>{children}</Providers>
          </div>
        </div>
      </body>
    </html>
  );
}
