import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { OnboardingGate } from "@/components/onboarding-gate";
import { AppProviders } from "@/components/providers";
import { V2BodyTag } from "@/app/v2/_shared/body-tag";
import "./globals.css";
import "./v2/v2.css";
import "./v2/wizard.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Contractor Studio",
  description: "Pricing intelligence for contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${jetbrainsMono.variable}`}>
        <V2BodyTag />
        <AppProviders>
          <OnboardingGate>{children}</OnboardingGate>
        </AppProviders>
      </body>
    </html>
  );
}
