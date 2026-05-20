import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./v2.css";
import "./wizard.css";
import { V2BodyTag } from "./_shared/body-tag";

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
  title: "Contractor Studio — v2",
  description: "Contractor Studio design preview",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <V2BodyTag />
      {children}
    </div>
  );
}
