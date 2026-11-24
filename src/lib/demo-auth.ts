/** Demo sign-in is available on local development; production requires an explicit opt-in. */
export const isDemoLoginEnabled =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_LOGIN === "true";
