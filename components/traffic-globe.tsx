'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import worldData from '@/lib/world-countries.json';
import { generateTrafficData, formatVisitors, type CountryTraffic } from '@/lib/traffic-data';

const GLOBE_RADIUS = 2;

/** Convert latitude/longitude to a 3D position on the sphere surface */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Country border outlines drawn as line segments on the sphere surface */
function CountryBorders() {
  const geometry = useMemo(() => {
    const countries = worldData as unknown as {
      features: Array<{
        geometry: { type: string; coordinates: number[][][] | number[][][][] } | null;
      }>;
    };
    const positions: number[] = [];
    const r = GLOBE_RADIUS + 0.006;

    const addRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = latLngToVector3(ring[i][1], ring[i][0], r);
        const b = latLngToVector3(ring[i + 1][1], ring[i + 1][0], r);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    };

    for (const f of countries.features) {
      const geom = f.geometry;
      if (!geom) continue;
      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) addRing(ring);
      } else if (geom.type === 'MultiPolygon') {
        for (const polygon of geom.coordinates) for (const ring of polygon) addRing(ring);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#71717a" transparent opacity={0.55} />
    </lineSegments>
  );
}

/** Heatmap color ramp: low = emerald, mid = amber, high = rose */
function intensityColor(t: number): THREE.Color {
  const low = new THREE.Color('#34d399');
  const mid = new THREE.Color('#fbbf24');
  const high = new THREE.Color('#f43f5e');
  if (t < 0.5) return low.clone().lerp(mid, t * 2);
  return mid.clone().lerp(high, (t - 0.5) * 2);
}

function HeatBar({
  data,
  hovered,
  onHover,
}: {
  data: CountryTraffic;
  hovered: boolean;
  onHover: (code: string | null) => void;
}) {
  const { position, quaternion, height, color } = useMemo(() => {
    const surface = latLngToVector3(data.lat, data.lng, GLOBE_RADIUS);
    const normal = surface.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    const h = 0.12 + data.intensity * 0.9;
    return { position: surface, quaternion: q, height: h, color: intensityColor(data.intensity) };
  }, [data]);

  return (
    <group position={position} quaternion={quaternion}>
      {/* Heat column */}
      <mesh
        position={[0, height / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(data.code);
        }}
        onPointerOut={() => onHover(null)}
      >
        <cylinderGeometry args={[0.018, 0.026, height, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2.2 : 1.1}
          toneMapped={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Base glow dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.05 + data.intensity * 0.06, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html position={[0, height + 0.18, 0]} center distanceFactor={7} zIndexRange={[100, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950/95 px-3 py-1.5 text-center shadow-xl">
            <div className="text-[11px] font-bold text-white">{data.country}</div>
            <div className="text-[10px] font-medium text-zinc-400">
              {formatVisitors(data.visitors)} visitors / mo
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function GlobeScene({ traffic }: { traffic: CountryTraffic[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !hoveredCode) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <group ref={groupRef}>
        {/* Core sphere */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial color="#101014" roughness={0.85} metalness={0.15} />
        </mesh>
        {/* Graticule wireframe */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS + 0.002, 36, 24]} />
          <meshBasicMaterial color="#3f3f46" wireframe transparent opacity={0.1} />
        </mesh>
        {/* Country border outlines */}
        <CountryBorders />
        {/* Atmosphere glow */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS + 0.16, 64, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.05} side={THREE.BackSide} />
        </mesh>
        {/* Heat bars per country */}
        {traffic.map((c) => (
          <HeatBar key={c.code} data={c} hovered={hoveredCode === c.code} onHover={setHoveredCode} />
        ))}
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3.2}
        maxDistance={9}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
      />
    </>
  );
}

export default function TrafficGlobe({ url }: { url: string }) {
  const traffic = useMemo(() => generateTrafficData(url), [url]);
  const total = useMemo(() => traffic.reduce((sum, c) => sum + c.visitors, 0), [traffic]);
  const topCountries = traffic.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Globe canvas */}
      <div
        className="relative h-[420px] flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
        role="img"
        aria-label="Rotating 3D globe showing estimated website visitor heatmap by country"
      >
        <Canvas camera={{ position: [0, 1.1, 6.2], fov: 42 }} dpr={[1, 2]}>
          <color attach="background" args={['#09090b']} />
          <GlobeScene traffic={traffic} />
        </Canvas>

        {/* Legend overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Low</span>
          <div
            className="h-1.5 w-24 rounded-full"
            style={{ background: 'linear-gradient(to right, #34d399, #fbbf24, #f43f5e)' }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">High</span>
        </div>

        <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* Top countries panel */}
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 lg:w-72">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Est. Monthly Visitors
          </div>
          <div className="text-2xl font-black text-white">{formatVisitors(total)}</div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="flex flex-col gap-2.5">
          {topCountries.map((c, i) => (
            <div key={c.code} className="flex items-center gap-3">
              <span className="w-4 text-xs font-bold text-zinc-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-zinc-200">{c.country}</span>
                  <span className="shrink-0 text-xs font-bold text-zinc-400">
                    {formatVisitors(c.visitors)}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, c.intensity * 100)}%`,
                      background: 'linear-gradient(to right, #34d399, #fbbf24, #f43f5e)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-2 text-[10px] leading-relaxed text-zinc-500">
          Simulated traffic distribution estimated from domain fingerprint. Connect real analytics for
          exact figures.
        </p>
      </div>
    </div>
  );
}
