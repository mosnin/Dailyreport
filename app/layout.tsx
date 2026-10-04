import type { Metadata, Viewport } from "next";
import { Geist_Mono, Urbanist } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Report",
  description: "Track, score, and find the patterns across every dimension of your life.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Daily Report" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={`${urbanist.variable} ${geistMono.variable} h-full antialiased`} style={{ colorScheme: "light" }} suppressHydrationWarning>
        <body className="min-h-full bg-background text-foreground">
          <ThemeProvider>
            <ConvexClientProvider>
              {children}
              <Toaster />
            </ConvexClientProvider>
          </ThemeProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
            }}
          />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
