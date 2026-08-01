import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "荔枝测评 | 荔学卷",
  description: "基于内在结构养育理论，帮助家长看见真实的孩子，在合适的时机给合适的支持",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSansSC.variable} min-h-full flex flex-col antialiased`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
