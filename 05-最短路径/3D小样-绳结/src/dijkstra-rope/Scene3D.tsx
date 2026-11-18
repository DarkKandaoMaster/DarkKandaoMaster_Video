// 3D 层：桌面、珠子、绳子、提环、卷尺。只画几何，不放任何数字或文字（数字都在平面层 Hud.tsx）。
import React, { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { progress } from "../base/anim";
import { mixColor } from "../base/theme";
import { applyCam } from "./camera";
import { beadPositions, DIST, EDGES, R, ropeShape, ROPE_RADIUS, S, SRC, type V3 } from "./kinematics";
import { camAt, heightAt, LOCK_FRAME, T } from "./timeline";

export const COL = {
  bg: "#FAF7F0",
  table: "#EEE6D5",
  tableEdge: "#E2D8C4",
  bead: "#7D8798", // 还在桌上
  coral: "#E5582F", // 已锁定 / 绷直
  rope: "#B5AC9E", // 松的绳子
  ropeTaut: "#D9643C",
  ink: "#353C4A", // 提环、卷尺盒
  tape: "#F4EBD2",
  tick: "#5A6274",
};

/** 卷尺在源点左边多远（世界单位） */
export const TAPE_DX = -1.45;
/** 提环圈心比源点珠心高多少 */
export const RING_UP = R + 0.1;

/** 提环的高度：落下 → 扣住 → 跟着源点上升 */
export const ringY = (f: number, srcY: number): number => {
  const drop = progress(f, T.hookDown, T.hookOn - T.hookDown);
  return srcY + RING_UP + (1 - drop) * 5.5;
};

const CameraRig: React.FC = () => {
  const f = useCurrentFrame();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  applyCam(camera, camAt(f));
  return null;
};

const Rope: React.FC<{ pts: V3[]; color: string }> = ({ pts, color }) => {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return new THREE.TubeGeometry(curve, 64, ROPE_RADIUS, 8, false);
  }, [pts]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
    </mesh>
  );
};

const Box: React.FC<{ p: V3; s: V3; color: string; shadow?: boolean }> = ({ p, s, color, shadow = true }) => (
  <mesh position={p} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
  </mesh>
);

export const Scene3D: React.FC = () => {
  const f = useCurrentFrame();
  const H = heightAt(f);
  const P = beadPositions(H);
  const src = P[SRC];
  const ry = ringY(f, src[1]);
  const tapeX = src[0] + TAPE_DX;

  // 卷尺：从卷尺盒顶（y = R）拉到提环高度；0 刻度对准源点珠心
  const tapeTop = ry;
  const tapeLen = Math.max(0, tapeTop - R);
  const showTape = f >= T.hookOn - 4 ? 1 : 0;
  const ticks: Array<{ k: number; locked: boolean }> = [];
  for (let k = 0; k <= Math.floor(H + 1e-6); k++) ticks.push({ k, locked: DIST.includes(k) });

  return (
    <>
      <CameraRig />
      <color attach="background" args={[COL.bg]} />
      <hemisphereLight args={["#FFFDF7", "#D9CFBD", 1.55]} />
      <directionalLight
        position={[-3.5, 9, 5.5]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <directionalLight position={[5, 4, -3]} intensity={0.35} />

      {/* 桌面 */}
      <Box p={[0.8, -0.07, 1.15]} s={[5.6, 0.14, 4.8]} color={COL.table} shadow={false} />

      {/* 绳子 */}
      {EDGES.map((e) => {
        const shape = ropeShape(e, P);
        // 只有树边、且下面那颗珠子已经离桌（被锁定）才着色：和 HUD 里的锁定一一对应
        const child = DIST[e.u] > DIST[e.v] ? e.u : e.v;
        const hot = e.tree ? shape.taut * progress(f, LOCK_FRAME[child], 8) : 0;
        return <Rope key={e.key} pts={shape.pts} color={mixColor(COL.rope, COL.ropeTaut, hot)} />;
      })}

      {/* 珠子 */}
      {P.map((p, v) => {
        const lock = progress(f, LOCK_FRAME[v], 8);
        const isSrc = v === SRC;
        const srcMark = isSrc ? progress(f, T.hookDown, 20) : 0;
        const color = mixColor(mixColor(COL.bead, "#5E6880", srcMark), COL.coral, lock);
        return (
          <mesh key={v} position={p} castShadow receiveShadow>
            <sphereGeometry args={[R, 40, 28]} />
            <meshStandardMaterial color={color} roughness={0.62} metalness={0} />
          </mesh>
        );
      })}

      {/* 提环 + 吊杆 */}
      <mesh position={[src[0], ry, src[2]]} castShadow>
        <torusGeometry args={[0.1, 0.022, 16, 48]} />
        <meshStandardMaterial color={COL.ink} roughness={0.5} />
      </mesh>
      <mesh position={[src[0], ry + 0.1 + 15, src[2]]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 30, 12]} />
        <meshStandardMaterial color={COL.ink} roughness={0.5} />
      </mesh>

      {/* 卷尺盒 + 尺带 + 刻度 */}
      <Box p={[tapeX, R / 2, src[2]]} s={[0.26, R, 0.22]} color={COL.ink} />
      {showTape && tapeLen > 0.002 ? (
        <>
          <Box p={[tapeX, R + tapeLen / 2, src[2]]} s={[0.12, tapeLen, 0.012]} color={COL.tape} />
          {/* 尺带顶端连到提环的小横杆 */}
          <Box p={[(tapeX + src[0] - 0.1) / 2, tapeTop, src[2]]} s={[Math.abs(src[0] - 0.1 - tapeX), 0.016, 0.016]} color={COL.ink} />
          {ticks.map(({ k, locked }) => {
            const y = src[1] - k * S;
            if (y < R + 0.004) return null;
            const lockedNow = locked && f >= LOCK_FRAME[DIST.indexOf(k)];
            const w = lockedNow ? 0.13 : k % 2 === 0 ? 0.07 : 0.045;
            return (
              <Box
                key={k}
                p={[tapeX - 0.06 + w / 2, y, src[2] + 0.009]}
                s={[w, lockedNow ? 0.022 : 0.012, 0.006]}
                color={lockedNow ? COL.coral : COL.tick}
                shadow={false}
              />
            );
          })}
        </>
      ) : null}
    </>
  );
};
