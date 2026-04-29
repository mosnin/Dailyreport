import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { auth0 } from "@/lib/auth0";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { ConvexWithAuth0Provider } from "@/components/ConvexWithAuth0Provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Report",
  description: "Accountability through daily and weekly reporting",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Daily Report" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Auth0Provider user={session?.user}>
          <ConvexWithAuth0Provider>
            {children}
            <Toaster />
          </ConvexWithAuth0Provider>
        </Auth0Provider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </body>
    </html>
  );
}
