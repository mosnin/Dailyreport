export default {
  providers: [
    {
      // Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard env vars
      // Found in Clerk dashboard → JWT Templates → Convex → Issuer
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
