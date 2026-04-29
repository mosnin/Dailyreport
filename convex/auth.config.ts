export default {
  providers: [
    {
      // AUTH0_DOMAIN is just the domain (e.g. "yourapp.us.auth0.com")
      // Convex needs the full issuer URL with https://
      domain: process.env.AUTH0_DOMAIN
        ? `https://${process.env.AUTH0_DOMAIN}`
        : process.env.AUTH0_ISSUER_BASE_URL,
      applicationID: process.env.AUTH0_CLIENT_ID,
    },
  ],
};
