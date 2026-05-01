import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Lora } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexWithClerkProvider } from "@/components/ConvexWithClerkProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Daily Report",
  description: "Accountability through daily and weekly reporting",
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
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} ${lora.variable} h-full antialiased`} suppressHydrationWarning>
        <body className="min-h-full bg-background text-foreground">
          <ThemeProvider>
            <ConvexWithClerkProvider>
              {children}
              <WelcomeOverlay />
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
