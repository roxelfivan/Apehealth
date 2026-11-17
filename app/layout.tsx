import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { LocaleHtmlLang } from "@/components/LocaleHtmlLang";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display-loaded",
  subsets: ["latin"],
  display: "swap",
});

// Traditional Chinese fallbacks: the Latin fonts above have no CJK glyphs,
// so a zh-Hant UI needs a font that covers Chinese characters.
const cjkSans = Noto_Sans_TC({
  variable: "--font-cjk-sans-loaded",
  subsets: ["latin"],
  display: "swap",
});

const cjkDisplay = Noto_Serif_TC({
  variable: "--font-cjk-display-loaded",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Apehealth",
  title: "Apehealth",
  description:
    "Snap a meal photo. MiniMax estimates calories. Everything stays on this device.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apehealth",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#14110c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${cjkSans.variable} ${cjkDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PwaRegister />
        <LocaleHtmlLang />
        {children}
      </body>
    </html>
  );
}
