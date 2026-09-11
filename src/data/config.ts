/** Shared, site-wide constants for the public stats API. Previously
 * duplicated independently in index.astro and Stats.astro — Stats.astro's
 * own comment admitted the fallback rate was "kept in sync by hand" with
 * index.astro's, which nothing actually enforced. One source now. */
export const API_BASE = "https://app.midearth.ai/api/v1/public";

// $IDLE → USD conversion rate, for the "(~$X)" next to Total IDLE
// distributed. Backend endpoint for this is landing separately; until it's
// live (and on any later failure), every request falls back to this
// last-known rate. Update this constant when a fresher rate is available.
export const FALLBACK_IDLE_USD_RATE = 0.00183;
