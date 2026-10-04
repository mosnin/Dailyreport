import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login",
  "/signup",
  "/api/webhooks(.*)",
]);

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

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

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isStaticAsset(request)) return;
    const signedIn = await convexAuth.isAuthenticated();
    if (isAuthPage(request) && signedIn) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
    if (!isPublicRoute(request) && !signedIn) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } }
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
