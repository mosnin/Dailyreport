/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as affirmations from "../affirmations.js";
import type * as ai from "../ai.js";
import type * as aiInternal from "../aiInternal.js";
import type * as analytics from "../analytics.js";
import type * as email from "../email.js";
import type * as emailInternal from "../emailInternal.js";
import type * as subscriptions from "../subscriptions.js";
import type * as crons from "../crons.js";
import type * as dreams from "../dreams.js";
import type * as giving from "../giving.js";
import type * as goals from "../goals.js";
import type * as problems from "../problems.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as reports from "../reports.js";
import type * as scores from "../scores.js";
import type * as users from "../users.js";
import type * as visualizations from "../visualizations.js";
import type * as rateLimits from "../rateLimits.js";
import type * as integrations from "../integrations.js";
import type * as agentJobs from "../agentJobs.js";
import type * as externalTasks from "../externalTasks.js";
import type * as rituals from "../rituals.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  affirmations: typeof affirmations;
  ai: typeof ai;
  aiInternal: typeof aiInternal;
  analytics: typeof analytics;
  email: typeof email;
  emailInternal: typeof emailInternal;
  subscriptions: typeof subscriptions;
  crons: typeof crons;
  dreams: typeof dreams;
  giving: typeof giving;
  goals: typeof goals;
  problems: typeof problems;
  pushNotifications: typeof pushNotifications;
  pushSubscriptions: typeof pushSubscriptions;
  reports: typeof reports;
  scores: typeof scores;
  users: typeof users;
  visualizations: typeof visualizations;
  rateLimits: typeof rateLimits;
  integrations: typeof integrations;
  agentJobs: typeof agentJobs;
  externalTasks: typeof externalTasks;
  rituals: typeof rituals;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
