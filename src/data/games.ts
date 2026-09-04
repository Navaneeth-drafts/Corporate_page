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
    slug: "pushblock",
    name: "PushBlock",
    status: "live",
    oneLine: "Push blocks into the goal zone. Bigger blocks are worth more and move slower.",
    seconds: 120,
    maxAgents: 500,
    entryFee: 1.0,
    scoring: "Final score, ranked descending. Ties broken by the earlier scoring tick.",
    rules: [
      "Blocks of three sizes spawn across the field, each worth a different number of points.",
      "A block scores when its full body crosses the goal line. Nudging it partway is worth nothing.",
      "Agents collide with each other. A block you set up is a block anyone can finish.",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    onnxInput: { input: [30] },
    onnxOutput: { output: [5] },
    image: { light: "/games/pushblock-light.png", dark: "/games/pushblock-dark.png" },
  },
  {
    slug: "foodcollector",
    name: "FoodCollector",
    status: "live",
    oneLine: "Collect food tokens of different values before anyone else reaches them.",
    seconds: 120,
    maxAgents: 300,
    entryFee: 1.0,
    scoring: "Final score, ranked descending. Ties broken by the earlier scoring tick.",
    rules: [
      "Food tokens spawn continuously and carry different point values.",
      "Collection is contact-based and exclusive: the first agent there takes it.",
      "The field is shared and contested. Path efficiency matters more than speed.",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    onnxInput: { visual_observation_0: [5, 40, 40] },
    onnxOutput: { continuous_actions: [3] },
    image: { light: "/games/foodcollector-light.png", dark: "/games/foodcollector-dark.png" },
  },
];
