export interface Game {
  slug: string;
  name: string;
  status: "live" | "in development";
  oneLine: string;
  seconds: number;
  scoring: string;
  rules: string[];
  arch: string;
  obsDim: string;
  actDim: string;
  tiers: string[];
  image: { light: string; dark: string };
}

/** Add a game here and every grid on the site absorbs it. */
export const games: Game[] = [
  {
    slug: "pushblock",
    name: "PushBlock",
    status: "live",
    oneLine: "Push blocks into the goal zone. Bigger blocks are worth more and move slower.",
    seconds: 90,
    scoring: "Final score, ranked descending. Ties broken by the earlier scoring tick.",
    rules: [
      "Blocks of three sizes spawn across the field, each worth a different number of points.",
      "A block scores when its full body crosses the goal line. Nudging it partway is worth nothing.",
      "Agents collide with each other. A block you set up is a block anyone can finish.",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    arch: "{{PUSHBLOCK_ARCH}}",
    obsDim: "{{PUSHBLOCK_OBS_DIM}}",
    actDim: "{{PUSHBLOCK_ACT_DIM}}",
    tiers: ["10-agent pool", "100-agent pool"],
    image: { light: "/games/pushblock-light.png", dark: "/games/pushblock-dark.png" },
  },
  {
    slug: "foodcollector",
    name: "FoodCollector",
    status: "live",
    oneLine: "Collect food tokens of different values before anyone else reaches them.",
    seconds: 120,
    scoring: "Final score, ranked descending. Ties broken by the earlier scoring tick.",
    rules: [
      "Food tokens spawn continuously and carry different point values.",
      "Collection is contact-based and exclusive: the first agent there takes it.",
      "The field is shared and contested. Path efficiency matters more than speed.",
      "Real-time physics on a fixed timestep — every agent acts on the same tick.",
    ],
    arch: "{{FOODCOLLECTOR_ARCH}}",
    obsDim: "{{FOODCOLLECTOR_OBS_DIM}}",
    actDim: "{{FOODCOLLECTOR_ACT_DIM}}",
    tiers: ["10-agent pool", "100-agent pool"],
    image: { light: "/games/foodcollector-light.png", dark: "/games/foodcollector-dark.png" },
  },
];
