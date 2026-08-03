import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { AppBackground } from "@/components/app-background";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClassSync — School ERP",
  description: "Multi-tenant school ERP with attendance, scheduling, and payments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClassSync",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="relative min-h-full flex flex-col">
        <AppBackground />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <Providers>
            <ServiceWorkerRegistration />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
