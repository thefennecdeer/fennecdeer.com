import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const setupScene = (container) => {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    1e7
  );
  const ambientLight = new THREE.AmbientLight("#888888");
  const pointLight = new THREE.PointLight("#ffffff", 2, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  

  renderer.setSize(window.innerWidth, window.innerHeight);
  scene.add(ambientLight, pointLight);
  camera.position.z = 0;
  camera.position.x = 0;
  camera.position.y = 150;
//   controls.enablePan = false;
  controls.enabled = false;

  container.append(renderer.domElement);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  const animate = () => {
    controls.update();
    // console.log(camera.position)
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
};
  animate();

  return { scene };
};
// const fitCameraToObject = (camera, object) => {
//     const boundingBox = new THREE.Box3().setFromObject(object);
//     const center = boundingBox.getCenter(new THREE.Vector3());
//     const size = boundingBox.getSize(new THREE.Vector3());
//     const offset = 1.25;
//     const maxDim = Math.max(size.x, size.y, size.z);
//     const fov = camera.fov * (Math.PI / 180);
//     const cameraZ = Math.abs((maxDim / 4) * Math.tan(fov * 2)) * offset;
//     const minZ = boundingBox.min.z;
//     const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;
  
//     controls.target = center;
//     controls.maxDistance = cameraToFarEdge * 2;
//     controls.minDistance = cameraToFarEdge * 0.5;
//     controls.saveState();
//     camera.position.z = cameraZ;
//     camera.far = cameraToFarEdge * 3;
//     camera.updateProjectionMatrix();
//   };   
export { setupScene };