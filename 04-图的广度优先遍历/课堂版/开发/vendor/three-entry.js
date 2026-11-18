// three.js 只取页面用到的部分，由 scripts/bundle_three.py 用本机已有的 esbuild 打包成 IIFE（全局变量 THREE），
// 产物 three.iife.min.js 由 build.py 内联进单文件页面。three.js 是 MIT 许可（见 three-LICENSE.txt）。
export {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Color, Vector3, Matrix4, Quaternion, Euler, Object3D, Group,
  HemisphereLight, DirectionalLight, AmbientLight,
  BoxGeometry, CylinderGeometry, SphereGeometry, IcosahedronGeometry, ConeGeometry, PlaneGeometry, CircleGeometry, RingGeometry, TorusGeometry, ExtrudeGeometry, Shape,
  BufferGeometry, Float32BufferAttribute,
  MeshLambertMaterial, MeshBasicMaterial, LineBasicMaterial, LineDashedMaterial,
  Mesh, InstancedMesh, Line, LineSegments,
  SRGBColorSpace, DoubleSide, MathUtils,
} from 'three';
