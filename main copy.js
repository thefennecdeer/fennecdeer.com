import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as YUKA from "yuka";
import { Light } from "three";
import { randFloat } from "three/src/math/mathutils";
import { SeekBehavior, Vector3 } from "yuka";
import { SelectiveBloomEffect, EffectComposer, EffectPass, RenderPass} from "postprocessing";
// import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
// import { SSAARenderPass } from 'three/addons/postprocessing/SSAARenderPass.js';
// import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let skyfragurl = "./shaders/sky.frag";
let skyverturl = "./shaders/sky.vert";
let skyfrag;
let skyvert;
let bloomfragurl = "./shaders/bloom.frag";
let bloomverturl = "./shaders/bloom.vert";
let bloomfrag;
let bloomvert;
let mainurl = "./models/websitetest.glb";
let main;
let skyhdr;

let seekPos;
let controls;
let alignmentBehavior
let cohesionBehavior
let separationBehavior
let seekBehavior
let obstacleBehavior
const params = {
  alignment: 1,
  cohesion: 0.4,
  separation: 4,
  seek: 1.0,
  obstacle: 0.5
};
const camParams = {
  exposure: 1.1,
  bloomStrength: 1.5,
  bloomThreshold: 0.4,
  bloomRadius: 0.6,
  campos: function () {
    console.log(camera.position)
    console.log(camera.rotation)
  }
};
const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};
const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );
let bloomComposer;
const SEPARATION = 100,
  NUMLIGHTS = 12;

let lightarray = [];
const entityManager = new YUKA.EntityManager();
let container, stats;
let camera, scene, renderer, composer;

var clock = new THREE.Clock();
const time = new YUKA.Time();
const loader = new GLTFLoader();
Promise.all([
  new THREE.FileLoader().loadAsync(skyfragurl),
  new THREE.FileLoader().loadAsync(skyverturl),
  new THREE.FileLoader().loadAsync(bloomfragurl),
  new THREE.FileLoader().loadAsync(bloomverturl),
  modelLoader(mainurl)
  // new RGBELoader().setPath('textures/').loadAsync('solitude_night_1k.hdr')

]).then(loaded => {
  skyfrag = loaded[0];
  skyvert = loaded[1];
  bloomfrag = loaded[2];
  bloomvert = loaded[3];
  main = loaded[4];
  main.scene.traverse( function( node ) {

    if ( node.isMesh ) { 
      node.castShadow = true;
      node.receiveShadow = true;
      let newMat = new THREE.MeshPhongMaterial();
      newMat.vertexColors = true
      node.material = newMat

      if (node.name == "light") {
        node.layers.enable( BLOOM_SCENE )
        seekPos = node.position;
      }

    }
    if (node.isLight) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.intensity = 2;
      
      node.layers.enable( BLOOM_SCENE )

    }

} );
  // skyhdr = loaded[5];
  init();
  animate();
});

function modelLoader(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, data => resolve(data), null, reject);
  })
}

function sync(entity, renderComponent) {
  renderComponent.matrix.copy(entity.worldMatrix);
}

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
function renderBloom( mask ) {

  if ( mask === true ) {

    scene.traverse( darkenNonBloomed );
    bloomComposer.render();
    scene.traverse( restoreMaterial );

  } else {

    camera.layers.set( BLOOM_SCENE );
    bloomComposer.render();
    camera.layers.set( ENTIRE_SCENE );

  }

}

function darkenNonBloomed( obj ) {

  if ( (obj.isMesh) && bloomLayer.test( obj.layers ) === false ) {

    materials[ obj.uuid ] = obj.material;
    obj.material = darkMaterial;

  }

}

function restoreMaterial( obj ) {

  if ( materials[ obj.uuid ] ) {

    obj.material = materials[ obj.uuid ];
    delete materials[ obj.uuid ];

  }

}

// function tweenPositionComplete(object,x,y) {
//   object.position.x = x;
//   object.position.y = y;
//   tweenPosition(object);

// }

// function tweenPosition(object) {
//   var xPosition = Math.random();
//   var yPosition = Math.random();

//   new TWEEN.Tween(object.position)
//   .to({x:xPosition, y:yPosition}, 1000)
//   .easing(TWEEN.Easing.Cubic.InOut)
//   .start()
//   .yoyo(true)
//   .repeat(Infinity)
//   // .onComplete(tweenPositionComplete(object, xPosition, yPosition))
//  // .onComplete(console.log("done"))
//   ;
// }
function initFireflies(){
  alignmentBehavior = new YUKA.AlignmentBehavior();
  cohesionBehavior = new YUKA.CohesionBehavior();
  separationBehavior = new YUKA.SeparationBehavior();
  seekBehavior = new YUKA.SeekBehavior(seekPos);
  obstacleBehavior = new YUKA.ObstacleAvoidanceBehavior();

  alignmentBehavior.weight = params.alignment;
  cohesionBehavior.weight = params.cohesion;
  separationBehavior.weight = params.separation;
  seekBehavior.weight = params.seek;
  obstacleBehavior.weight = params.obstacle;

  for (let i = 0; i < NUMLIGHTS; i++) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    const source = new THREE.PointLight(0xffffff, 1, 2);
    // const light = new THREE.Group();
    // light.add(source)
    // light.add(orb)
    light.matrixAutoUpdate = false;
    light.position.set(1 + 10, 1 + randFloat(-10, 10), 1 + randFloat(-10, 10));
    scene.add(light);
    lightarray.push(light);
    light.add(source);
    light.layers.enable( BLOOM_SCENE )
    const vehicle = new YUKA.Vehicle();
    vehicle.maxSpeed = 20;
    vehicle.updateNeighborhood = true;
    vehicle.neighborhoodRadius = 10;
    vehicle.setRenderComponent(light, sync);

    vehicle.steering.add(alignmentBehavior);
    vehicle.steering.add(cohesionBehavior);
    vehicle.steering.add(separationBehavior);
    vehicle.steering.add(seekBehavior);
    vehicle.steering.add(obstacleBehavior);

    const wanderBehavior = new YUKA.WanderBehavior();
    wanderBehavior.weight = 0.5;

    vehicle.steering.add(wanderBehavior);
    vehicle.position = new Vector3(randFloat(-5, 5), randFloat(-5, 5), randFloat(-5, 5));
    vehicle.rotation.fromEuler(0, 0, randFloat(-5, 5));
    entityManager.add(vehicle);
    // tweenPosition(light)
  }
}
function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    300
  );

  camera.position.set(-7, 1.2, 5.7);

  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0x01000);
  //
  //scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
  scene.fog = new THREE.Fog( new THREE.Color(0x00000), 10, 50 );

  // skyhdr.mapping = THREE.EquirectangularReflectionMapping;

  // scene.background = skyhdr;
  // scene.environment = skyhdr;

  initFireflies()

  var L1 = new THREE.PointLight(0xb887ed, 1.5);
  L1.position.z = 50;
  L1.position.y = 20;
  L1.position.x = 20;
  // scene.add(L1);
  // Dark Purple Pointlight
  var L2 = new THREE.PointLight(0x436ce8, 1.5);
  L2.position.z = 40;
  L2.position.y = -50;
  L2.position.x = -20;
  // scene.add(L2);

  // Phong material, Grey, Emissive
  var greyPhongMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color("rgb(100,30,100)"),
    specular: new THREE.Color("rgb(140,70,140)"),
    shininess: 10,
    transparent: 1,
    opacity: 1
  });
  //
  // SKYDOME
  const hemiLight = new THREE.HemisphereLight( 0x00000, 0x040611, 0.6 );

  hemiLight.position.set( 0, 50, 0 );
  scene.add( hemiLight );

  
  const groundGeo = new THREE.PlaneGeometry( 10, 10 );
				const groundMat = new THREE.MeshToonMaterial( { color: 0xffffff } );
				groundMat.color.setHSL( 0.095, 1, 0.75 );

				const ground = new THREE.Mesh( groundGeo, groundMat );
				ground.position.y = - 3;
				ground.rotation.x = - Math.PI / 2;
				ground.receiveShadow = true;
				scene.add( ground );
  
  const uniforms = {
    'topColor': { value: new THREE.Color( 0x00000 ) },
    'bottomColor': { value: new THREE.Color( 0x040611 ) },
    'offset': { value: -10 },
    'exponent': { value: 1 }
  };
  uniforms[ 'topColor' ].value.copy( hemiLight.color );

  //scene.fog.color.copy( uniforms[ 'bottomColor' ].value );

  const skyGeo = new THREE.SphereGeometry( 40, 32, 15 );
 

  const sky = new THREE.Mesh( skyGeo );
  scene.add( sky );

  
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const cube = new THREE.Mesh(geometry, greyPhongMat);
  scene.add(cube);

  scene.add(main.scene);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.useLegacyLights = true;
  renderer.shadowMap.enabled = true

  container.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  stats = new Stats();
  container.appendChild(stats.dom);

  const renderScene = new RenderPass(scene, camera);
  
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );

  bloomPass.threshold = camParams.bloomThreshold;
  bloomPass.strength = camParams.bloomStrength;
  bloomPass.radius = camParams.bloomRadius;

  bloomComposer = new EffectComposer( renderer );
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass( renderScene );
  bloomComposer.addPass( bloomPass );

  const finalPass = new ShaderPass(
    new THREE.ShaderMaterial( {
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture }
      },
      vertexShader: bloomvert,
      fragmentShader: bloomfrag,
      defines: {}
    } ), 'baseTexture'
  );
  finalPass.needsSwap = true;

  var ssaaRenderPass = new SSAARenderPass( scene, camera );
  ssaaRenderPass.sampleLevel = 32;
  ssaaRenderPass.unbiased = true;
    
  composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(
      window.innerWidth, 
      window.innerHeight, 
      { type: THREE.HalfFloatType }
    )
    );
    
   
    composer.addPass(renderScene);
    // composer.addPass(ssaaRenderPass);
    composer.addPass( finalPass );
  //
  camera.ca;

  const gui = new GUI();

  gui.add(camParams, "exposure", 0.1, 2).onChange(function(value) {
    renderer.toneMappingExposure = Math.pow(value, 4.0);
  });

  gui.add(camParams, "bloomThreshold", 0.0, 1.0).onChange(function(value) {
    bloomPass.threshold = Number(value);
  });

  gui.add(camParams, "bloomStrength", 0.0, 3.0).onChange(function(value) {
    bloomPass.strength = Number(value);
  });

  gui
    .add(camParams, "bloomRadius", 0.0, 1.0)
    .step(0.01)
    .onChange(function(value) {
      bloomPass.radius = Number(value);
    });
  gui
    .add(params, "alignment", 0.1, 2)
    .name("alignment")
    .onChange(value => (alignmentBehavior.weight = value));
  gui
    .add(params, "cohesion", 0.1, 2)
    .name("cohesion")
    .onChange(value => (cohesionBehavior.weight = value));
  gui
    .add(params, "separation", 0.1, 5)
    .name("separation")
    .onChange(value => (separationBehavior.weight = value));
  gui
    .add(params, "seek", 0.1, 2)
    .name("seek")
    .onChange(value => (seekBehavior.weight = value));
  
  gui
    .add(camParams, "campos",)
    .name("campos");
  
  window.addEventListener("resize", onWindowResize);
  

}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

//
function animate() {
  requestAnimationFrame(animate);
  const delta = time.update().getDelta();
  //console.log(delta)
  // TWEEN.update();
  entityManager.update(delta);
  render();
  controls.update();
  stats.update();
}

function render() {
  renderer.render(scene, camera);

  // const positions = particles.geometry.attributes.position.array;
// render scene with bloom
  renderBloom( true );

// render the entire scene, then render bloom scene on top
  composer.render();
  // delta += 0.1;

  // for (let [i, light] of lightarray.entries()){
  //   light.position.x = Math.sin((delta + (i*2)  / 3)* 0.5) * 4
  //   light.position.y = Math.sin((delta + (i*2) / 2 )* 0.5) * 4
  //   light.position.z = Math.sin((delta + (i*2) + 5)/2) * 4

  // }
  // for (let ix = 0; ix < AMOUNTX; ix++) {
  //   for (let iy = 0; iy < AMOUNTY; iy++) {
  //     positions[i] = Math.sin((count + i + 50) * 1) ;
  //     positions[i+1] = Math.cos((count + i + 52) * 1);
  //     positions[i+2] = Math.cos((count + i + 50) * 1)/2+1;
  //     // positions[i + 1] =
  //       // Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;

  //     // scales[j] =
  //     //   (Math.sin((ix + count) * 0.3) + 1) * .3 +
  //     //   (Math.sin((iy + count) * 0.5) + 1) * .3;

  //     i += 3;
  //     j++;
  //   }
  // }

  // particles.geometry.attributes.position.needsUpdate = true;
  // particles.geometry.attributes.scale.needsUpdate = true;
}
