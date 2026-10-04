/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as affirmations from "../affirmations.js";
import type * as agentJobs from "../agentJobs.js";
import type * as ai from "../ai.js";
import type * as aiInternal from "../aiInternal.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authUser from "../authUser.js";
import type * as checklist from "../checklist.js";
import type * as crons from "../crons.js";
import type * as dreams from "../dreams.js";
import type * as education from "../education.js";
import type * as email from "../email.js";
import type * as emailInternal from "../emailInternal.js";
import type * as externalTasks from "../externalTasks.js";
import type * as finances from "../finances.js";
import type * as giving from "../giving.js";
import type * as goals from "../goals.js";
import type * as growth from "../growth.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as lifePatterns from "../lifePatterns.js";
import type * as lifeScore from "../lifeScore.js";
import type * as problems from "../problems.js";
import type * as projects from "../projects.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reports from "../reports.js";
import type * as rituals from "../rituals.js";
import type * as scores from "../scores.js";
import type * as subscriptions from "../subscriptions.js";
import type * as trackerAI from "../trackerAI.js";
import type * as trackers from "../trackers.js";
import type * as users from "../users.js";
import type * as visualizations from "../visualizations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  affirmations: typeof affirmations;
  agentJobs: typeof agentJobs;
  ai: typeof ai;
  aiInternal: typeof aiInternal;
  analytics: typeof analytics;
  auth: typeof auth;
  authUser: typeof authUser;
  checklist: typeof checklist;
  crons: typeof crons;
  dreams: typeof dreams;
  education: typeof education;
  email: typeof email;
  emailInternal: typeof emailInternal;
  externalTasks: typeof externalTasks;
  finances: typeof finances;
  giving: typeof giving;
  goals: typeof goals;
  growth: typeof growth;
  health: typeof health;
  http: typeof http;
  integrations: typeof integrations;
  lifePatterns: typeof lifePatterns;
  lifeScore: typeof lifeScore;
  problems: typeof problems;
  projects: typeof projects;
  pushNotifications: typeof pushNotifications;
  pushSubscriptions: typeof pushSubscriptions;
  rateLimits: typeof rateLimits;
  reports: typeof reports;
  rituals: typeof rituals;
  scores: typeof scores;
  subscriptions: typeof subscriptions;
  trackerAI: typeof trackerAI;
  trackers: typeof trackers;
  users: typeof users;
  visualizations: typeof visualizations;
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
