// Shared by src/pages/agents.astro and src/pages/games.astro's live-patch
// scripts — was previously copy-pasted identically in both (and duplicates
// the intent of formatTensorSpec in src/data/games.ts, used for the
// build-time fallback render of the same values). is:inline scripts can't
// import a TS module directly, so this is a plain external file instead.
function formatSpec(spec) {
  if (!spec || typeof spec !== "object") return null;
  return Object.keys(spec)
    .map(function (name) {
      return name + ": [" + spec[name].join(", ") + "]";
    })
    .join(", ");
}
