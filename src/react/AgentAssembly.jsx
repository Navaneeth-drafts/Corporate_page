import AgentAssemblyScene from "./AgentAssemblyScene.jsx";

/** Mounts the particle scene and gives it somewhere to size itself
 * against. See AgentAssemblyScene.jsx for the actual animation. */
export default function AgentAssembly() {
  return (
    <div className="assembly">
      <AgentAssemblyScene />

      {/* No-JS visitors get the plain mark — the particle scene is a
          presentation of it, never the only source. */}
      <noscript>
        <div className="assembly-fallback">
          <img src="/logo-assembly-source.png" alt="MidEarth" width="220" height="200" />
        </div>
      </noscript>
    </div>
  );
}
