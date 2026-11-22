import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dirFor, type Locale } from "@/i18n/config";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/geist-mono";
import "@fontsource/anton/400.css";
import "@fontsource/caveat/600.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "VAYRO — Cartes de fidélité digitales", template: "%s · VAYRO" },
  description: "Cartes de fidélité digitales dans Apple Wallet et Google Wallet. QR code, NFC, récompenses et campagnes — sans application à installer.",
  applicationName: "VAYRO",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101828" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" toastOptions={{ classNames: { toast: "!rounded-xl !border-border !shadow-lg !font-sans" } }} />
      </body>
    </html>
  );
}
