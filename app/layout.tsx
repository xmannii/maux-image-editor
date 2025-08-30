import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner"
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// buy the font from fontIran and use it here https://fontiran.com/
const yekan = localFont({
  src: "./fonts/YekanBakh-VF.woff2",
  variable: "--font-yekan",
});
export const metadata: Metadata = {
  metadataBase: new URL("https://edit.maux.site"),
  title: {
    default: "ماکس | ویرایشگر رایگان عکس آنلاین",
    template: "%s | ماکس",
  },
  description:
    "ماکس؛ ویرایشگر رایگان و ساده‌ی عکس آنلاین با پشتیبانی کامل فارسی و راست‌چین. برش، چرخش، تغییر اندازه پیکسلی، تنظیم روشنایی/کنتراست/اشباع، دانلود سریع و خروجی PNG/JPEG/WebP. محصولی از پلتفرم هوش مصنوعی فارسی ماکس.",
  applicationName: "ماکس - ویرایشگر عکس",
  authors: [{ name: "ماکس (Maux) - پلتفرم هوش مصنوعی فارسی" }],
  creator: "ماکس (Maux)",
  publisher: "ماکس (Maux)",
  keywords: [
    "ویرایش عکس",
    "ادیت عکس",
    "ویرایشگر آنلاین",
    "ابزار ادیت تصویر",
    "برش عکس",
    "چرخش عکس",
    "تغییر اندازه تصویر",
    "خروجی PNG",
    "خروجی JPEG",
    "خروجی WebP",
    "راست‌چین",
    "فارسی",
    "رایگان",
    "ماکس",
    "Maux",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "ماکس | ویرایشگر رایگان عکس آنلاین",
    description:
      "ماکس؛ ویرایشگر رایگان و ساده‌ی عکس آنلاین با پشتیبانی کامل فارسی و راست‌چین. برش، چرخش، تغییر اندازه پیکسلی، تنظیم روشنایی/کنتراست/اشباع، دانلود سریع و خروجی PNG/JPEG/WebP.",
    siteName: "ماکس",
    url: "/",
    images: [
      { url: "/opengraph-image.png", alt: "Maux Image Editor" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ماکس | ویرایشگر رایگان عکس آنلاین",
    description:
      "ماکس؛ ویرایشگر رایگان و ساده‌ی عکس آنلاین با پشتیبانی کامل فارسی و راست‌چین. برش، چرخش، تغییر اندازه پیکسلی، تنظیم روشنایی/کنتراست/اشباع، دانلود سریع و خروجی PNG/JPEG/WebP.",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
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
        <Toaster position="top-center"/>
      </body>
    </html>
  );
}
