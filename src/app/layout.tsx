import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fraunces, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const deva = Tiro_Devanagari_Hindi({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Rasa by Narayanam — Premium Catering Platform",
  description: "Premium celebration catering, reimagined. Hygienic kitchen, trained chefs, fair rates. Book your wedding or corporate event across Jharkhand, Bengal, Chhattisgarh & Odisha.",
  keywords: ["Rasa", "Narayanam", "catering", "wedding", "Jamshedpur", "Jharkhand"],
  authors: [{ name: "Narayanam Foods & Catering" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${deva.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
