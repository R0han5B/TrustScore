import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrustScore - Verified Reviews Platform",
  description: "Discover verified reviews and trust scores for local shops. AI-powered sentiment analysis for informed decisions.",
  keywords: ["TrustScore", "Reviews", "Local Shops", "Trust Score", "Sentiment Analysis", "Verified Reviews"],
  authors: [{ name: "TrustScore Team" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "TrustScore - Verified Reviews Platform",
    description: "Discover verified reviews and trust scores for local shops",
    url: "https://trustscore.com",
    siteName: "TrustScore",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustScore - Verified Reviews Platform",
    description: "Discover verified reviews and trust scores for local shops",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
