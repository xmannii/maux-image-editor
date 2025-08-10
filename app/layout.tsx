import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const yekan = localFont({
  src: "./fonts/YekanBakh-VF.woff2",
  variable: "--font-yekan",
});
export const metadata: Metadata = {
  title: "ماکس | ابزار ادیت عکس ",
  description: "ابزار ادیت عکس",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa"  className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${yekan.variable} font-yekan antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
