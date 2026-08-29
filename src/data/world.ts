/**
 * A coarse land mask for the dot-matrix world map, and the cloud regions
 * plotted on it.
 *
 * The mask is a 5° equirectangular grid: row 0 spans 90..85°N, each row five
 * degrees further south; column 0 spans 180..175°W, each column five degrees
 * further east. Land is stored as inclusive column spans per row, which is far
 * easier to read and correct than a bitmap string.
 *
 * It is deliberately coarse — this is a schematic, not a survey. Antarctica is
 * omitted, as it is on most dot maps, because a solid bar across the bottom
 * unbalances the composition and there are no cloud regions on it.
 */
export interface LandRow {
  /** grid row: latitude of the row's top edge is 90 - row * 5 */
  r: number;
  /** inclusive [startCol, endCol] spans of land */
  s: [number, number][];
}

export const LAND: LandRow[] = [
  { r: 1, s: [[27, 31]] }, // northern Greenland
  { r: 2, s: [[14, 22], [24, 32], [39, 41], [47, 58]] }, // Canadian Arctic, Greenland, Svalbard, Russian Arctic
  { r: 3, s: [[4, 7], [10, 22], [24, 32], [48, 64]] },
  { r: 4, s: [[3, 8], [9, 23], [25, 32], [37, 42], [42, 71]] },
  { r: 5, s: [[3, 8], [8, 24], [26, 31], [31, 33], [37, 42], [42, 71]] }, // + Iceland
  { r: 6, s: [[4, 6], [9, 25], [34, 35], [37, 42], [42, 71]] }, // + Scotland
  { r: 7, s: [[10, 25], [34, 36], [36, 42], [42, 71]] },
  { r: 8, s: [[11, 23], [35, 42], [42, 65]] },
  { r: 9, s: [[11, 22], [34, 42], [42, 63], [63, 65]] }, // + Japan
  { r: 10, s: [[11, 21], [34, 35], [37, 45], [45, 61], [61, 64]] },
  { r: 11, s: [[12, 20], [34, 43], [43, 48], [48, 56], [56, 60], [62, 64]] },
  { r: 12, s: [[13, 20], [33, 43], [43, 47], [48, 54], [54, 60]] },
  { r: 13, s: [[14, 18], [19, 21], [32, 43], [43, 47], [49, 54], [54, 60]] }, // + Cuba
  { r: 14, s: [[15, 18], [21, 24], [32, 44], [44, 46], [50, 53], [54, 58]] },
  { r: 15, s: [[17, 19], [21, 24], [32, 45], [50, 52], [55, 58], [60, 61]] },
  { r: 16, s: [[19, 20], [20, 24], [33, 45], [51, 52], [55, 57], [60, 61]] },
  { r: 17, s: [[20, 26], [34, 45], [55, 59]] },
  { r: 18, s: [[21, 27], [37, 44], [55, 60], [62, 66]] },
  { r: 19, s: [[21, 28], [38, 44], [56, 61], [63, 66]] },
  { r: 20, s: [[21, 28], [38, 44], [61, 65]] },
  { r: 21, s: [[22, 28], [38, 43], [44, 46], [59, 65]] }, // + Madagascar
  { r: 22, s: [[22, 27], [38, 43], [44, 45], [58, 66]] },
  { r: 23, s: [[22, 26], [39, 42], [58, 66]] },
  { r: 24, s: [[21, 25], [39, 42], [59, 66]] },
  { r: 25, s: [[21, 24], [64, 66], [70, 71]] }, // + Tasmania, New Zealand
  { r: 26, s: [[21, 23], [69, 71]] },
  { r: 27, s: [[21, 22], [69, 70]] },
  { r: 28, s: [[21, 22]] },
];

export interface Region {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** show the label on the map at wider viewports */
  major?: boolean;
}

/** Real cloud regions. Positions are real; the traffic drawn between them is not. */
export const REGIONS: Region[] = [
  { id: "us-west-2", label: "Oregon", lat: 45.8, lon: -119.7, major: true },
  { id: "us-east-1", label: "N. Virginia", lat: 38.9, lon: -77.5, major: true },
  { id: "sa-east-1", label: "São Paulo", lat: -23.5, lon: -46.6, major: true },
  { id: "eu-west-1", label: "Ireland", lat: 53.3, lon: -6.2, major: true },
  { id: "eu-central-1", label: "Frankfurt", lat: 50.1, lon: 8.7 },
  { id: "af-south-1", label: "Cape Town", lat: -33.9, lon: 18.4, major: true },
  { id: "me-south-1", label: "Bahrain", lat: 26.0, lon: 50.6 },
  { id: "ap-south-1", label: "Mumbai", lat: 19.1, lon: 72.9, major: true },
  { id: "ap-southeast-1", label: "Singapore", lat: 1.35, lon: 103.8, major: true },
  { id: "ap-northeast-2", label: "Seoul", lat: 37.6, lon: 127.0 },
  { id: "ap-northeast-1", label: "Tokyo", lat: 35.7, lon: 139.7, major: true },
  { id: "ap-southeast-2", label: "Sydney", lat: -33.9, lon: 151.2, major: true },
];

/** Where the arcs converge. Not a place — the arena is the logical centre. */
export const HUB = { lat: 22.3, lon: 114.17 };
