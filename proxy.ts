import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/agent/progress",
  "/api/agent/complete",
  "/api/agent/fail",
  "/api/agent/sync-tasks",
  "/api/agent/data",
]);

const isStaticAsset = createRouteMatcher([
  "/_next/(.*)",
  "/favicon.ico",
  "/sw.js",
  "/manifest.json",
  "/icons/(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/(.*)\\.(css|js|map|woff|woff2|png|jpg|jpeg|svg|ico|webp|json)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isStaticAsset(req)) return;
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
