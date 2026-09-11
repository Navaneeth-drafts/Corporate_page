/** The site's 6 themes and their meta-theme-color values. Previously
 * hard-coded identically in two separate places — Base.astro's pre-paint
 * theme resolver and Nav.astro's toggle handler — with nothing keeping
 * them in sync if a theme were ever added, renamed, or removed. Both are
 * `is:inline` scripts that can't import an ES module directly, so this is
 * passed into each via `define:vars` from their Astro frontmatter instead. */
export const THEMES = ["dark", "light", "ember", "circuit", "orbit", "vault"];

export const THEME_COLORS: Record<string, string> = {
  dark: "#050506",
  light: "#fdfdfc",
  ember: "#06070a",
  circuit: "#020405",
  orbit: "#000205",
  vault: "#03060a",
};
