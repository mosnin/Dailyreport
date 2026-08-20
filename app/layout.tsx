import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexWithClerkProvider } from "@/components/ConvexWithClerkProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ascend - Life Analytics",
  description: "Measure every dimension of your life. Track, score, and find the patterns that move you forward.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ascend" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b22" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${geist.variable} ${geistMono.variable} h-full antialiased`} style={{ colorScheme: "dark" }} suppressHydrationWarning>
        <body className="min-h-full bg-background text-foreground">
          <ThemeProvider>
            <ConvexWithClerkProvider>
              {children}
              <Toaster />
            </ConvexWithClerkProvider>
          </ThemeProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
