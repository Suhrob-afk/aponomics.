import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "./Header";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "aponomics",
  description: "Economic thought for a changing world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-[#F4F1EA] text-[#1A1A1A]">
        <div className="min-h-screen flex flex-col">
          <Header />

          <div className="flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
