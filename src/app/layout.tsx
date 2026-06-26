import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Navigation from "@/components/customs/Navigation";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Optikerf — Cutting Stock Optimizer",
  description: "Optimal rebar cutting patterns, cross-sheet offcut reuse, and site-ready Excel exports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${manrope.variable} ${spaceMono.variable} antialiased`}
      >
        <div className="orb-2" />
        <Navigation />
        <main className="relative z-[1] pb-20">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
