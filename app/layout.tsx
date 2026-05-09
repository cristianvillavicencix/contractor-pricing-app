import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FloatingCalculatorButton } from "@/components/floating-calculator-button";
import { OnboardingGate } from "@/components/onboarding-gate";
import { AppProviders } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Contractor Pricing App",
  description: "Pricing intelligence for contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          font-sans
          antialiased
          bg-[var(--page-bg)]
          text-[var(--brand-navy)]
        `}
      >
        <AppProviders>
          <OnboardingGate>{children}</OnboardingGate>
        </AppProviders>
        <FloatingCalculatorButton />
      </body>
    </html>
  );
}
