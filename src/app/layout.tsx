import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "食材管理",
  description: "食材管理・レシピ提案PWA",
};

const isDemo = process.env.NEXT_PUBLIC_APP_ENV === 'demo';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isDemo && (
          <div className="bg-orange-400 text-white text-center text-sm font-bold py-2 px-4 sticky top-0 z-50">
            🧪 デモ環境 — データは定期的にリセットされます。削除しても大丈夫です！
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
