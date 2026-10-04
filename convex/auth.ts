import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ResendOTP, ResendOTPPasswordReset } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return { email, ...(name ? { name } : {}) };
      },
      verify: ResendOTP,
      reset: ResendOTPPasswordReset,
    }),
  ],
  callbacks: {
    // Our `users` table carries app fields (name, createdAt, plan, ...), so we
    // create the document ourselves. Accounts with a verified email attach to
    // an existing profile with that email, which carries over users who signed
    // up before the move off Clerk.
    async createOrUpdateUser(rawCtx, args) {
      const ctx = rawCtx as unknown as MutationCtx;
      const profile = args.profile;
      const email =
        typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
      const name = typeof profile.name === "string" ? profile.name.trim() : "";
      const image = typeof profile.image === "string" ? profile.image : undefined;

      if (args.existingUserId) {
        const existing = await ctx.db.get(args.existingUserId as Id<"users">);
        if (existing && image && !existing.image) {
          await ctx.db.patch(existing._id, { image });
        }
        return args.existingUserId;
      }

      const emailVerified =
        profile.emailVerified === true ||
        args.provider.type === "oauth" ||
        args.provider.type === "oidc" ||
        args.provider.type === "email" ||
        (args as { shouldLinkViaEmail?: boolean }).shouldLinkViaEmail === true;

      if (email && emailVerified) {
        const matches = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .take(2);
        if (matches.length === 1) {
          if (image && !matches[0].image) {
            await ctx.db.patch(matches[0]._id, { image });
          }
          return matches[0]._id;
        }
      }

      return await ctx.db.insert("users", {
        email,
        name: name || email,
        image,
        onboardingComplete: false,
        createdAt: Date.now(),
      });
    },
  },
});
