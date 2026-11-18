// 3D 镜头参数 → three.js 相机。ThreeCanvas 里的相机和平面层（HUD）投影用的相机走同一个函数，保证标签贴得住。
import * as THREE from "three";
import { camPosition, type Cam } from "./timeline";

export const W = 1920;
export const H = 1080;

/** 把镜头 c 套到相机上：cx = 看向点落在屏幕上的横坐标（用 setViewOffset 平移画面，右边留给 HUD） */
export const applyCam = (cam: THREE.PerspectiveCamera, c: Cam): void => {
  const [x, y, z] = camPosition(c);
  cam.position.set(x, y, z);
  cam.up.set(0, 1, 0);
  cam.lookAt(c.tx, c.ty, c.tz);
  cam.fov = c.fov;
  cam.near = 0.1;
  cam.far = 200;
  const off = 2 * (W / 2 - c.cx);
  const full = W + Math.abs(off);
  cam.aspect = full / H;
  cam.setViewOffset(full, H, Math.max(0, off), 0, W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

const overlayCam = new THREE.PerspectiveCamera();
const tmp = new THREE.Vector3();

/** 世界坐标 → 屏幕像素（左上角为原点）；z > 1 表示在相机后面 */
export const makeProjector = (c: Cam) => {
  applyCam(overlayCam, c);
  return (p: readonly [number, number, number]): { x: number; y: number; ok: boolean } => {
    tmp.set(p[0], p[1], p[2]).project(overlayCam);
    return { x: ((tmp.x + 1) / 2) * W, y: ((1 - tmp.y) / 2) * H, ok: tmp.z < 1 };
  };
};
