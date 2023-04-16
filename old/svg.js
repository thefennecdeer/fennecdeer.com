import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

const fillMaterial = new THREE.MeshBasicMaterial({ color: "#000000" });
const stokeMaterial = new THREE.LineBasicMaterial({
  color: "#000000",
});

const renderSVG = (extrusion) => {
    const loader = new SVGLoader();

    const svgGroup = new THREE.Group();
    const updateMap = [];
    loader.load("/FDBlack.svg", function (data) {
        const svgData = data
   
  
    svgGroup.scale.y *= -1;
    svgData.paths.forEach((path) => {
      const shapes = SVGLoader.createShapes(path);
  
      shapes.forEach((shape) => {
        const meshGeometry = new THREE.ExtrudeBufferGeometry(shape, {
          depth: extrusion,
          bevelEnabled: false
        });
        const linesGeometry = new THREE.EdgesGeometry(meshGeometry);
        const mesh = new THREE.Mesh(meshGeometry, fillMaterial);
        const lines = new THREE.LineSegments(linesGeometry, stokeMaterial);
  
        updateMap.push({ shape, mesh, lines });
        svgGroup.add(mesh, lines);
      });
    });
  
    const box = new THREE.Box3().setFromObject(svgGroup);
    const size = box.getSize(new THREE.Vector3());
    const yOffset = size.y / -2;
    const xOffset = size.x / -2;
  
    svgGroup.children.forEach((item) => {
      item.position.x = xOffset;
      item.position.y = yOffset;
    });
    svgGroup.rotateX(-Math.PI / 2);
  return {
      object: svgGroup
  }
    });
    
    return {
      object: svgGroup,
      update(extrusion) {
        updateMap.forEach((updateDetails) => {
          const meshGeometry = new THREE.ExtrudeBufferGeometry(
            updateDetails.shape,
            {
              depth: extrusion,
              bevelEnabled: false
            }
          );
          const linesGeometry = new THREE.EdgesGeometry(meshGeometry);
  
          updateDetails.mesh.geometry.dispose();
          updateDetails.lines.geometry.dispose();
          updateDetails.mesh.geometry = meshGeometry;
          updateDetails.lines.geometry = linesGeometry;
        });
      }
    };
  };

export { renderSVG };