import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The hero visual: a field of fine, luminous orb particles (the same
 * language as the Astra reference) scattered in space, tied to scroll
 * position — scrolling down draws them into the real MidEarth mark
 * (points sampled straight from the mark's own silhouette, coloured
 * blue/green like the mark itself). The assembly peaks exactly as the
 * section comes to fully cover the screen, then scatters apart again
 * as scrolling continues past it — it doesn't just sit there formed
 * while it scrolls out of view. Scrolling back up unwinds it the same
 * way. Purely a function of scroll position either direction.
 */

const PARTICLE_COUNT = 32000; // denser still — the light-theme ground was reading too washed-out at 24k, same source colours
const MARK_SCALE = 4.6; // baked into sampleLogo's positions below
const MARK_HALF_WIDTH = MARK_SCALE / 2;

// Three visual sizes ("some small, some medium, some a little big"),
// each its own layer since a single PointsMaterial can't vary size
// per-particle. Proportions favour small so the cloud still reads as
// fine dust rather than confetti.
const SIZE_TIERS = [
  { share: 0.55, size: 0.032 },
  { share: 0.3, size: 0.052 },
  { share: 0.15, size: 0.082 },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Bucket-fill selection: a coarse grid over the candidates' own bounding
 * box, one candidate picked per cell, so a fixed-size sample fills the
 * silhouette evenly instead of clumping wherever pixels happen to be
 * dense. */
function bucketPick(candidates, count) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  candidates.forEach((c) => {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  });

  const cols = Math.ceil(Math.sqrt(count * ((maxX - minX) / Math.max(1, maxY - minY))));
  const rows = Math.ceil(count / cols);
  const cellW = (maxX - minX) / cols || 1;
  const cellH = (maxY - minY) / rows || 1;
  const buckets = new Map();
  candidates.forEach((c) => {
    const cx = Math.min(cols - 1, Math.floor((c.x - minX) / cellW));
    const cy = Math.min(rows - 1, Math.floor((c.y - minY) / cellH));
    const key = cy * cols + cx;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  });

  const picked = [];
  buckets.forEach((bucket) => picked.push(bucket[Math.floor(Math.random() * bucket.length)]));
  while (picked.length < count) picked.push(candidates[Math.floor(Math.random() * candidates.length)]);
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  while (picked.length < count) picked.push(candidates[Math.floor(Math.random() * candidates.length)]);
  return picked.slice(0, count);
}

/** Map a sampled pixel to its local scene position, using the FULL
 * shape's bounding box (never the eye ovals' own, much smaller box) —
 * that shared frame is what makes computeEyeMasks' circles line up with
 * where the eyes actually are on the mark, instead of being rescaled to
 * fill the whole cloud's extent. */
function pixelToPosition(c, bounds) {
  const { minX, maxX, minY, maxY, scale, aspect } = bounds;
  return [
    ((c.x - minX) / (maxX - minX) - 0.5) * scale,
    (0.5 - (c.y - minY) / (maxY - minY)) * scale * aspect,
    (Math.random() - 0.5) * 0.12,
  ];
}

function buildPositionsAndColors(picked, bounds) {
  const positions = new Float32Array(picked.length * 3);
  const colors = new Float32Array(picked.length * 3);
  picked.forEach((c, i) => {
    const [x, y, z] = pixelToPosition(c, bounds);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = c.r / 255;
    colors[i * 3 + 1] = c.g / 255;
    colors[i * 3 + 2] = c.b / 255;
  });
  return { positions, colors };
}

// How much bigger than the eye's own silhouette its push-mask is — just
// enough padding to reach real bordering dust, not so much that the mask
// reads as bigger/rounder than the actual eye (a circular mask sized to
// an oval's longest axis bulges out along its short axis; the ellipse
// fit below avoids that, but a little slack still helps against sampling
// jitter at the true silhouette's edge).
const EYE_MASK_PAD = 1.05;

/** Never turned into particles — just measured. Two clusters (left/right
 * eye), split on which side of the eye pixels' own mean x they fall on,
 * each collapsed to a local-space centre + an ELLIPSE (separate x/y
 * half-extents, not one circular radius) matching the true oval's own
 * aspect ratio — a single circumscribing radius would have to cover the
 * shape's longest axis and so bulge out along its shorter one, reading
 * as rounder than the real eye. This is what lets the body dust treat
 * "the eye" as a small region it can push particles out of at render
 * time (see DustLayer's eyeMasks/eyeBounceRef), instead of a shape baked
 * once into which pixels became particle targets. */
function computeEyeMasks(eyeCandidates, bounds) {
  if (!eyeCandidates.length) return [];
  const pts = eyeCandidates.map((c) => {
    const [x, y] = pixelToPosition(c, bounds);
    return { x, y };
  });
  const meanX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const groups = [pts.filter((p) => p.x <= meanX), pts.filter((p) => p.x > meanX)].filter(
    (g) => g.length
  );
  return groups.map((group) => {
    const cx = group.reduce((s, p) => s + p.x, 0) / group.length;
    const cy = group.reduce((s, p) => s + p.y, 0) / group.length;
    let rx = 0, ry = 0;
    group.forEach((p) => {
      const ax = Math.abs(p.x - cx);
      const ay = Math.abs(p.y - cy);
      if (ax > rx) rx = ax;
      if (ay > ry) ry = ay;
    });
    return { x: cx, y: cy, rx: rx * EYE_MASK_PAD, ry: ry * EYE_MASK_PAD };
  });
}

/** Sample the mark's own alpha AND colour into a fine, evenly-spread
 * point cloud. Each particle keeps the exact colour of the source pixel
 * it was sampled from, so the assembled cloud reproduces the mark's real
 * blue-to-green gradient in place, not a randomised mix. The two
 * near-white eye pixels are excluded from the body candidates entirely,
 * so no body particle ever lands there — they read as empty gaps, same
 * as the mascot's eyes being plain holes in the shape — but rather than
 * being discarded outright, they're reduced to a centre + radius per eye
 * (computeEyeMasks) so the body dust can push nearby particles out of a
 * small moving circle there at render time (see DustLayer's eyeMasks
 * prop), instead of the gap being permanently fixed in place. Sampled
 * from a high-resolution offscreen copy of the source art so a dense
 * particle count still finds a distinct pixel per particle instead of
 * repeating. */
function sampleLogo(img, count) {
  const size = 480;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  const candidates = [];
  const eyeCandidates = [];
  let minX = size, maxX = 0, minY = size, maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const a = data[i + 3];
      if (a <= 100) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isEye = r > 205 && g > 205 && b > 205; // near-white eye ovals
      if (isEye) {
        eyeCandidates.push({ x, y, r, g, b });
        continue;
      }
      candidates.push({ x, y, r, g, b });
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!candidates.length) return null;

  // The shape's own bounding box — shared by the body and the eyes so
  // both map into the same coordinate frame (see pixelToPosition above).
  const bounds = {
    minX, maxX, minY, maxY,
    scale: MARK_SCALE,
    aspect: (maxY - minY) / (maxX - minX),
  };

  const { positions, colors } = buildPositionsAndColors(bucketPick(candidates, count), bounds);
  const eyeMasks = computeEyeMasks(eyeCandidates, bounds);

  return { positions, colors, eyeMasks };
}

/** A wide, flat drift of dust spanning the full section left-to-right —
 * not a small ball, so the "scatter" state itself reads as filling the
 * whole big section before it draws inward into the mark. */
function buildScatter(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = (Math.random() - 0.5) * 15.5;
    out[i * 3 + 1] = (Math.random() - 0.5) * 5.6;
    out[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
  }
  return out;
}

function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Neutral white-to-transparent only — no colour of its own, so each
  // particle's real vertex colour (blue or green) shows through instead
  // of every particle washing toward one tint as they blend additively.
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Local-space (pre-fitScale) radius of the cursor's disturbance bubble.
// Local space spans about MARK_HALF_WIDTH (2.3) either side of 0, so this
// affects a modest, fingertip-sized patch of the cloud, never the whole
// mark. Particles inside it are rotated (swirled) around the cursor
// point rather than pushed radially outward — a pure rotation keeps
// every particle exactly as far from the cursor as it started, so the
// patch churns in place instead of emptying out into a visible hole.
const CURSOR_FIELD_RADIUS = 0.85;
const CURSOR_FIELD_SWIRL = 1.4; // max rotation, in radians, right at the cursor

// The eyes' one-time "juggle" on load: a couple of quick up-down wobbles
// that decay to nothing within ~1.5-2s. This is the Y-offset applied to
// each eye mask's centre (see computeEyeMasks/DustLayer), not a property
// of any particle — the "juggle" is the hole moving, not its contents.
// BOUNCE_READY gates when the clock starts — see Scene's bounce timer for
// why it isn't simply "on mount" (the assembly section sits right below
// the sticky nav with no filler above it, so `eased` is still ramping up
// from 0 for the first few hundred ms after mount; starting the decay
// then would burn most of the wobble's amplitude before `eased` ever
// lets it show).
const BOUNCE_READY = 0.8; // eased-progress threshold that starts the bounce clock
const BOUNCE_FREQUENCY = 12.8; // rad/s — 20% slower than the original 16
const BOUNCE_AMPLITUDE = 0.36; // local-space units — bigger than an eye's own radius
const BOUNCE_DECAY = 1.68; // exponential decay rate — 20% slower than the original 2.1, so it also lingers proportionally longer

/** One size-tier's worth of the shared cloud. Reads the already-eased,
 * already-smoothed progress computed once by the parent Scene each
 * frame, so every tier stays in perfect lockstep with no drift. Also
 * reads the parent's cursor field (local-space position + intensity) so
 * only particles within CURSOR_FIELD_RADIUS of the cursor swirl around
 * it — everywhere else in the mark stays put.
 *
 * `eyeMasks` is what makes the eyes "juggle" without a single particle
 * ever being drawn there: `eyeMasks.masks` are small circles (see
 * computeEyeMasks) that any particle landing inside gets radially pushed
 * out of, to the circle's own edge — same displace-don't-hide trick as
 * the cursor swirl above, just push-to-edge instead of rotate.
 * `eyeMasks.bounceRef` (computed once per frame in Scene, shared across
 * every tier so they all push in lockstep) offsets each mask's Y centre
 * by the one-time on-load wobble — at rest it's 0 and the mask sits
 * exactly over the gap that would exist anyway, so this reproduces
 * today's static hole; while it's live, the mask sweeps up and down and
 * temporarily displaces whichever real, still-coloured dust currently
 * borders it, which reads as the void itself wobbling. */
function DustLayer({ scatter, target, colors, size, glowTex, reduced, progressRef, cursorFieldRef, eyeMasks }) {
  const pointsRef = useRef(null);
  const positionsRef = useRef(scatter.slice());

  useEffect(() => {
    if (reduced) {
      positionsRef.current.set(target);
      if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [reduced, target]);

  useFrame(() => {
    if (reduced) return; // static final position, set once above
    const geom = pointsRef.current;
    if (!geom) return;
    const eased = progressRef.current;
    const pos = geom.geometry.attributes.position.array;
    const field = cursorFieldRef.current;
    const fieldStrength = field.active * eased;
    const masks = eyeMasks ? eyeMasks.masks : null;
    const bounceY = eyeMasks ? eyeMasks.bounceRef.current : 0;

    for (let i = 0; i < pos.length; i += 3) {
      let bx = scatter[i] + (target[i] - scatter[i]) * eased;
      let by = scatter[i + 1] + (target[i + 1] - scatter[i + 1]) * eased;
      pos[i + 2] = scatter[i + 2] + (target[i + 2] - scatter[i + 2]) * eased;

      if (masks && masks.length) {
        for (let m = 0; m < masks.length; m++) {
          const mask = masks[m];
          const mx = mask.x;
          const my = mask.y + bounceY;
          const dx = bx - mx;
          const dy = by - my;
          // Normalised elliptical distance (1.0 == exactly on the eye's
          // own edge) rather than a circular one, so the push-out follows
          // the real oval's aspect ratio instead of its longest axis.
          const nx = dx / mask.rx;
          const ny = dy / mask.ry;
          const ndist = Math.sqrt(nx * nx + ny * ny);
          if (ndist < 1) {
            const push = 1 / (ndist || 0.0001);
            bx = mx + dx * push;
            by = my + dy * push;
          }
        }
      }

      if (fieldStrength > 0.001) {
        const dx = bx - field.x;
        const dy = by - field.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CURSOR_FIELD_RADIUS) {
          const falloff = 1 - dist / CURSOR_FIELD_RADIUS;
          const angle = falloff * falloff * CURSOR_FIELD_SWIRL * fieldStrength;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          pos[i] = field.x + dx * cos - dy * sin;
          pos[i + 1] = field.y + dx * sin + dy * cos;
          continue;
        }
      }
      pos[i] = bx;
      pos[i + 1] = by;
    }
    geom.geometry.attributes.position.needsUpdate = true;
    geom.rotation.y = eased * 0.15; // a faint settle-in turn, not continuous spin
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positionsRef.current, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={glowTex}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  );
}

function Scene({ reduced, containerRef }) {
  const [sample, setSample] = useState(null);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const scatter = useMemo(() => buildScatter(PARTICLE_COUNT), []);
  const progressRef = useRef(reduced ? 1 : 0);
  const smoothProgress = useRef(reduced ? 1 : 0);
  // The eyes' shared "juggle" clock — computed once per frame here (not
  // per DustLayer tier) so all three size tiers push their bordering
  // particles out of the same, currently-identical mask position. See
  // BOUNCE_READY et al. and DustLayer's eyeMasks handling.
  const eyeBounceStart = useRef(null);
  const eyeBounceRef = useRef(0);
  // Cursor position, normalised -1..1 relative to the section (not the
  // window) — this is screen/NDC space, used to raycast into the mark's
  // own local coordinate space below. `active` is a separate eased 0..1
  // intensity (not just position) so that on pointerleave the effect
  // actually fades to nothing, instead of just drifting its (still-live)
  // position back to screen-center and disturbing whatever's there.
  const pointerTarget = useRef({ x: 0, y: 0, active: 0 });
  const pointerSmooth = useRef({ x: 0, y: 0, active: 0 });
  // The cursor's disturbance field in the mark's own local (pre-fitScale)
  // space, recomputed each frame via raycast — this is what DustLayer
  // actually reads to know which particles are near the cursor.
  const cursorFieldRef = useRef({ x: 0, y: 0, active: 0 });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();

  // On wide/landscape screens the mark comfortably fits at its full
  // baked size — same look as before. On narrow/portrait screens the
  // camera's horizontal field of view shrinks relative to vertical, so
  // without this the mark's sides (and an eye) get clipped off. Scale
  // the whole cloud down only as much as needed to keep it fully in
  // frame, computed live from the section's actual on-screen aspect.
  const fitScale = useMemo(() => {
    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const aspect = size.width / (size.height || 1);
    const dist = camera.position.z;
    const visibleHalfHeight = dist * Math.tan(vFovRad / 2);
    const visibleHalfWidth = visibleHalfHeight * aspect;
    const fill = 0.92;
    return Math.min(1, (visibleHalfWidth * fill) / MARK_HALF_WIDTH);
  }, [camera, size.width, size.height]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setSample(sampleLogo(img, PARTICLE_COUNT));
    img.src = "/logo-assembly-source.png";
  }, []);

  // Cursor-follow, cinnamon.co.uk "IMAGINE"-style: track the pointer
  // relative to the section itself, not the window, so the effect only
  // engages while hovering the mark's own area. Skipped entirely under
  // reduced motion.
  useEffect(() => {
    if (reduced) return;
    const el = containerRef.current;
    if (!el) return;
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
        active: 1,
      };
    };
    const handleLeave = () => {
      pointerTarget.current.active = 0;
    };
    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", handleLeave);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerleave", handleLeave);
    };
  }, [reduced, containerRef]);

  useFrame((state, delta) => {
    if (reduced) {
      progressRef.current = 1;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    // The section is guaranteed >= 100vh tall and starts below the fold.
    // As it scrolls up, its top edge travels from vh (not yet visible)
    // down to 0 — the assembly forms over that same distance, finishing
    // exactly as the section comes to fully cover the screen. Keep
    // scrolling past that point and the same distance runs in reverse:
    // the section's top continues from 0 toward -vh as it scrolls back
    // out of view, and the mark scatters apart again over that stretch,
    // so it never just sits there formed while it exits — it's back to
    // scattered dust by the time it's gone. A single symmetric "tent"
    // shape peaking at top=0, driven purely by scroll position either
    // way, so it stays fully reversible on scroll up too.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const rawProgress = Math.max(0, Math.min(1, 1 - Math.abs(rect.top) / vh));
    // Settle-in rate: 4.8, not 6 — 20% slower, so the particles' gather
    // into the mark reads as a felt motion rather than an instant snap.
    smoothProgress.current += (rawProgress - smoothProgress.current) * Math.min(delta * 4.8, 1);
    progressRef.current = easeInOutCubic(smoothProgress.current);

    // The eyes' one-time "juggle": latch the clock the first frame the
    // mark is substantially assembled, then a couple of quick up-down
    // wobbles decaying to ~0 within ~1.5-2s. Not started at mount — see
    // BOUNCE_READY's comment for why that would mostly go unseen here.
    if (eyeBounceStart.current === null && progressRef.current > BOUNCE_READY) {
      eyeBounceStart.current = state.clock.elapsedTime;
    }
    if (eyeBounceStart.current !== null) {
      const elapsed = state.clock.elapsedTime - eyeBounceStart.current;
      // * progressRef.current is a harmless no-op once past the threshold
      // (progress stays high while formed) and fades the wobble out if
      // the visitor scrolls away mid-bounce, instead of it riding on
      // scattered dust.
      eyeBounceRef.current =
        Math.sin(elapsed * BOUNCE_FREQUENCY) *
        BOUNCE_AMPLITUDE *
        Math.exp(-elapsed * BOUNCE_DECAY) *
        progressRef.current;
    }

    // Same exponential-decay-lerp as above, driven by pointer position —
    // both the NDC position and the separate active/inactive intensity
    // ease rather than snap.
    const k = Math.min(delta * 4, 1); // 20% slower than the original 5, matching the settle-in slowdown
    pointerSmooth.current.x += (pointerTarget.current.x - pointerSmooth.current.x) * k;
    pointerSmooth.current.y += (pointerTarget.current.y - pointerSmooth.current.y) * k;
    pointerSmooth.current.active += (pointerTarget.current.active - pointerSmooth.current.active) * k;

    // Raycast the eased NDC pointer onto the mark's own z=0 plane to get
    // a world-space hit point, then undo the group's fitScale to land in
    // the same local coordinate space the particle position arrays use —
    // that's what makes CURSOR_FIELD_RADIUS in DustLayer comparable to
    // real distances between particles.
    raycaster.setFromCamera({ x: pointerSmooth.current.x, y: pointerSmooth.current.y }, camera);
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      cursorFieldRef.current.x = hitPoint.x / fitScale;
      cursorFieldRef.current.y = hitPoint.y / fitScale;
    }
    // DustLayer multiplies this by its own progressRef, so the field only
    // has visible strength once the mark is substantially assembled, and
    // fades out on its own as it scatters, instead of fighting the
    // scroll-driven interpolation while particles are mid-flight.
    cursorFieldRef.current.active = pointerSmooth.current.active;
  });

  const tiers = useMemo(() => {
    if (!sample) return null;
    const out = [];
    let offset = 0;
    SIZE_TIERS.forEach(({ share, size }, idx) => {
      const count = idx === SIZE_TIERS.length - 1 ? PARTICLE_COUNT - offset : Math.round(PARTICLE_COUNT * share);
      const start = offset * 3;
      const end = (offset + count) * 3;
      out.push({
        size,
        scatter: scatter.subarray(start, end),
        target: sample.positions.subarray(start, end),
        colors: sample.colors.subarray(start, end),
      });
      offset += count;
    });
    return out;
  }, [sample, scatter]);

  // Bundled once so every tier reads the exact same masks + bounce clock
  // (identity is stable across renders since sample only changes once,
  // and eyeBounceRef never changes identity — only its .current value).
  const eyeMasks = useMemo(
    () => (sample?.eyeMasks?.length ? { masks: sample.eyeMasks, bounceRef: eyeBounceRef } : null),
    [sample]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 4]} intensity={22} color="#f0c36b" />
      <pointLight position={[-3, -2, 3]} intensity={14} color="#4fb8c4" />
      <group scale={fitScale}>
        {tiers &&
          tiers.map((t, i) => (
            <DustLayer
              key={i}
              scatter={t.scatter}
              target={t.target}
              colors={t.colors}
              size={t.size}
              glowTex={glowTex}
              reduced={reduced}
              progressRef={progressRef}
              cursorFieldRef={cursorFieldRef}
              eyeMasks={eyeMasks}
            />
          ))}
      </group>
    </>
  );
}

export default function AgentAssemblyScene() {
  const reduced = useReducedMotion();
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className="ambly-canvas"
      role="img"
      aria-label="The Mid Earth mark, formed from a field of luminous blue and green particles. The formation follows scroll position, peaking once this section fully covers the screen, and scattering apart again as you scroll further past it or back up."
    >
      <Canvas
        camera={{ position: [0, 0.1, 8.6], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      >
        <Scene reduced={reduced} containerRef={containerRef} />
      </Canvas>
    </div>
  );
}
