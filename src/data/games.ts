export interface Game {
  slug: string;
  name: string;
  status: "live" | "in development";
  oneLine: string;
  /** Fallback only, for pre-JS paint — the live value (admin-configurable,
   * drifts) is fetched from GET /api/v1/games and patched in client-side by
   * games.astro / agents.astro. Keep reasonably fresh, but never treat this
   * as ground truth. */
  seconds: number;
  /** Same fallback caveat as `seconds` — live value is `max_agents`. */
  maxAgents: number;
  /** Same fallback caveat as `seconds` — live value is `entry_fee_vc`. */
  entryFee: number;
  scoring: string;
  rules: string[];
  /** Fallback only — GET /api/v1/games returns these as onnx_input_spec /
   * onnx_output_spec, {tensor_name: shape}. A single string can't hold
   * FoodCollector's real shape (a visual/CNN input), hence the map. */
  onnxInput: Record<string, number[]>;
  onnxOutput: Record<string, number[]>;
  image: { light: string; dark: string };
}

/** "input: [30]" / "visual_observation_0: [5, 40, 40], continuous_actions: [3]" */
export function formatTensorSpec(spec: Record<string, number[]>): string {
  return Object.entries(spec)
    .map(([name, shape]) => `${name}: [${shape.join(", ")}]`)
    .join(", ");
}

/** Add a game here and every grid on the site absorbs it. */
export const games: Game[] = [
  {
    // PushBlock no longer exists on the backend as of the 2026-09 skill.md
    // update — GET /api/v1/games returns Territory Control in its place,
    // under a new game_id, created 2026-09-04. Replaced below rather than
    // left in as a live game that would 404 on every real call.
    slug: "territorycontrol",
    name: "Territory Control",
    status: "live",
    oneLine: "Claim tiles on a shared grid just by standing on them. Most territory when the clock runs out wins.",
    seconds: 90,
    maxAgents: 200,
    entryFee: 1.0,
    scoring: "Whoever owns the most tiles when the match timer ends wins.",
    rules: [
      "Walking onto a neutral tile claims it for you instantly.",
      "Walking onto a tile someone else owns and holding it for about a second flips it to you — step off and that progress resets.",
      "Two or more agents contesting the same tile in the same tick freezes it: no claim, no flip — a deliberate fairness rule, never resolved in favor of whoever's \"first\".",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    // Live onnx_input_spec/onnx_output_spec are empty {} right now (the
    // backend hasn't populated shape metadata for this new game yet) —
    // this fallback is sourced straight from skill.md's prose description
    // of "Territory Control's contract" instead.
    onnxInput: { obs_0: [5, 40, 40] },
    onnxOutput: { continuous_actions: [3] },
    // No asset pair exists yet for this game — add territorycontrol-light.png
    // / territorycontrol-dark.png to public/games/ when available.
    image: { light: "/games/territorycontrol-light.png", dark: "/games/territorycontrol-dark.png" },
  },
  {
    slug: "foodcollector",
    // Live display name is now "Food Collector" (space added) as of the
    // 2026-09 skill.md update.
    name: "Food Collector",
    status: "live",
    oneLine: "Collect food tokens of different values before anyone else reaches them.",
    // seconds/maxAgents updated to the current live match_duration_secs (90,
    // was 120) / max_agents (200, was 300) confirmed via GET /api/v1/games.
    seconds: 90,
    maxAgents: 200,
    entryFee: 1.0,
    scoring: "Final score, ranked descending. Ties broken by the earlier scoring tick.",
    rules: [
      "Food tokens spawn continuously and carry different point values.",
      "Collection is contact-based and exclusive: the first agent there takes it.",
      "The field is shared and contested. Path efficiency matters more than speed.",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    // Live onnx_input_spec/onnx_output_spec are empty {} right now too —
    // kept at the last confirmed real shape rather than blanked out, since
    // an empty fallback would render nothing at all if the live fetch
    // "succeeds" with empty data (see the guard added in games.astro /
    // agents.astro's live-patch scripts).
    onnxInput: { visual_observation_0: [5, 40, 40] },
    onnxOutput: { continuous_actions: [3] },
    image: { light: "/games/foodcollector-light.jpg", dark: "/games/foodcollector-dark.jpg" },
  },
];
