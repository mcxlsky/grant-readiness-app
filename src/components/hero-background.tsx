"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Mouse-reactive particle network ─────────────────────── */

const PARTICLE_COUNT = 80;
const CONNECTION_DISTANCE = 1.0;
const MOUSE_RADIUS = 2;

function ParticleNetwork() {
  const points = useRef<THREE.Points>(null!);
  const lines = useRef<THREE.LineSegments>(null!);
  const { pointer, viewport } = useThree();
  const mousePos = useRef(new THREE.Vector3());

  // Generate initial positions + velocities
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions: pos, velocities: vel };
  }, []);

  // Pre-allocate line geometry (max possible connections)
  const maxLines = PARTICLE_COUNT * 6;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  useFrame(() => {
    if (!points.current || !lines.current) return;

    const posAttr = points.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    // Map pointer to world coords
    mousePos.current.set(
      (pointer.x * viewport.width) / 2,
      (pointer.y * viewport.height) / 2,
      0
    );

    // Drift particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      arr[ix] += velocities[ix];
      arr[ix + 1] += velocities[ix + 1];
      arr[ix + 2] += velocities[ix + 2];

      // Wrap around edges
      if (arr[ix] > 5.5) arr[ix] = -5.5;
      if (arr[ix] < -5.5) arr[ix] = 5.5;
      if (arr[ix + 1] > 4) arr[ix + 1] = -4;
      if (arr[ix + 1] < -4) arr[ix + 1] = 4;

      // Subtle mouse repulsion
      const dx = arr[ix] - mousePos.current.x;
      const dy = arr[ix + 1] - mousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.008;
        arr[ix] += (dx / dist) * force;
        arr[ix + 1] += (dy / dist) * force;
      }
    }
    posAttr.needsUpdate = true;

    // Build connection lines between nearby particles
    let lineIdx = 0;
    const r = 0.42, g = 0.45, b = 0.95; // indigo-ish

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const ix = i * 3, jx = j * 3;
        const dx = arr[ix] - arr[jx];
        const dy = arr[ix + 1] - arr[jx + 1];
        const dz = arr[ix + 2] - arr[jx + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (d < CONNECTION_DISTANCE && lineIdx < maxLines) {
          const alpha = 1 - d / CONNECTION_DISTANCE;
          const offset = lineIdx * 6;

          linePositions[offset] = arr[ix];
          linePositions[offset + 1] = arr[ix + 1];
          linePositions[offset + 2] = arr[ix + 2];
          linePositions[offset + 3] = arr[jx];
          linePositions[offset + 4] = arr[jx + 1];
          linePositions[offset + 5] = arr[jx + 2];

          lineColors[offset] = r;
          lineColors[offset + 1] = g;
          lineColors[offset + 2] = b;
          lineColors[offset + 3] = r;
          lineColors[offset + 4] = g;
          lineColors[offset + 5] = b;

          // Fade by distance
          const a = alpha * 0.3;
          lineColors[offset] *= a + 0.4;
          lineColors[offset + 1] *= a + 0.4;
          lineColors[offset + 2] *= a + 0.4;
          lineColors[offset + 3] *= a + 0.4;
          lineColors[offset + 4] *= a + 0.4;
          lineColors[offset + 5] *= a + 0.4;

          lineIdx++;
        }
      }
    }

    // Update line geometry
    const lineGeo = lines.current.geometry;
    const lPosAttr = lineGeo.attributes.position;
    const lColAttr = lineGeo.attributes.color;
    (lPosAttr.array as Float32Array).set(linePositions);
    (lColAttr.array as Float32Array).set(lineColors);
    lineGeo.setDrawRange(0, lineIdx * 2);
    lPosAttr.needsUpdate = true;
    lColAttr.needsUpdate = true;
  });

  return (
    <>
      {/* Dots */}
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#a5b4fc"
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Lines */}
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
            count={maxLines * 2}
            array={linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColors, 3]}
            count={maxLines * 2}
            array={lineColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

/* ── Canvas wrapper ───────────────────────────────────────── */

export default function HeroBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ParticleNetwork />
    </Canvas>
  );
}
