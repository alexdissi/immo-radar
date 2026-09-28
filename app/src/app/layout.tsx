import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import type React from "react";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Immo Radar",
  description: "Recherche d'appartements à Paris et autour, sur Bien'ici, SeLoger, Logic-Immo, PAP et Leboncoin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("h-full antialiased", inter.variable, interHeading.variable, geistMono.variable)}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
