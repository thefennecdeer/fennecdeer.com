import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import Stats from "@tweenjs/tween.js";
import { OrbitControls } from "/three/examples/jsm/controls/OrbitControls";
import * as YUKA from "yuka";
import { Light } from "three";
import { randFloat } from "/three/src/math/mathutils.js";
import { SeekBehavior, Vector3 } from "yuka";
import { EffectComposer } from "/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "/three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/three/addons/postprocessing/UnrealBloomPass.js";
import { SSAARenderPass } from 'three/addons/postprocessing/SSAARenderPass.js';
import { ShaderPass } from '/three/addons/postprocessing/ShaderPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';


// let grassfragurl = "./shaders/grass.frag";
// let grassverturl = "./shaders/grass.vert";
// let grassfrag;
// let grassvert;
let bloomfragurl = "./shaders/bloom.frag";
let bloomverturl = "./shaders/bloom.vert";
let bloomfrag;
let screentexurl = "./textures/hehe.png";
let screentex;
let bloomvert;
let mainurl = "./models/websitetest.glb";
let main, objectCSS;
// let leavesMaterial
// let grassplane;
let adscreen;
let titlePos;

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let seekPos;
let controls;
let alignmentBehavior
let cohesionBehavior
let separationBehavior
let seekBehavior
let obstacleBehavior

let camTarget
let drain

const params = {
  alignment: 1,
  cohesion: 0.4,
  separation: 4,
  seek: 1.0,
  obstacle: 0.5
};
const camParams = {
  exposure: 1.1,
  bloomStrength: 0.7,
  bloomThreshold: 0.1,
  bloomRadius: 0.4,
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
const NUMLIGHTS = 20;



let textarray = [];
let lightarray = [];
const entityManager = new YUKA.EntityManager();
let container, stats;
let camera, scene, scene2, renderer, composer, CSSrenderer;
let mixer;
var clock = new THREE.Clock();
const time = new YUKA.Time();
const loader = new GLTFLoader();
Promise.all([
  // new THREE.FileLoader().loadAsync(grassfragurl),
  // new THREE.FileLoader().loadAsync(grassverturl),
  modelLoader(mainurl),
  new THREE.FileLoader().loadAsync(bloomfragurl),
  new THREE.FileLoader().loadAsync(bloomverturl),
  new THREE.TextureLoader().loadAsync(screentexurl),
  // new RGBELoader().setPath('textures/').loadAsync('solitude_night_1k.hdr')

]).then(loaded => {
  const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
  main = loaded[0];
  // grassfrag = loaded[0];
  // grassvert = loaded[1];
  bloomfrag = loaded[1];
  bloomvert = loaded[2];
  screentex = loaded[3];
  main.scene.traverse( function( node ) {
    if (node.name == "drain") {
      drain = node
    }
    if ( node.isMesh ) { 
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.name == "adscreen") {
        adscreen = node
        node.layers.enable( BLOOM_SCENE )

      }
     
      
      let newMat = new THREE.MeshPhongMaterial();
      newMat.vertexColors = true

      node.material = newMat
      if (node.name.includes("text")) {
        node.layers.enable( BLOOM_SCENE )

        console.log(node)
        textarray.push(node)
      }
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
function initScreen() {

  screentex.flipY = false;
  // screentex.offset.x = 0.5;
  // screentex.offset.y = 0.5;
  let newmat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    map: screentex
  })
  
  adscreen.material = newmat
}

function initText() {
  // screentex.offset.x = 0.5;

  let tex1 = new THREE.TextureLoader().load("./textures/hello.png")
  tex1.flipY = false;
  let tex2 = new THREE.TextureLoader().load("./textures/projects.png")
  tex2.flipY = false;
  // screentex.offset.y = 0.5;
  for(let object of textarray){
    let newmat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true
      })
    switch (object.name) {
      case "text1":
        newmat.map = tex1,
        object.material = newmat
        object.callback = function() { window.open("http://www.ipchicken.com", '_blank').focus(); }

        break;
      case "text2":
        newmat.map = tex2,
        object.material = newmat
        object.callback = function() {
          


          gsap.to(camera.position, {
            duration: 5,
            x: 2,
            y: -0.03,
            z: -4.6,
            ease: "power1.inOut",
            paused: false
          });
          gsap.to(camTarget, {
            duration: 5,
            x: drain.position.x,
            y: drain.position.y,
            z: drain.position.z,
            delay: 0.5,
            ease: "power1.inOut",
            paused: false,
                
            onComplete: () => {
              window.location.href = "./";
            }
          });
          gsap.to(camTarget, {
            duration: 8,
            y: drain.position.y - 10,
            delay: 4,
            ease: "power1.Out",
            paused: false
          });
          // controls.target = drain.position; 
          
        }

        break;
    }
  }
}
// function initGrass() {
//   const grassUniforms = {
//     time: {
//       value: 0
//     }
//   }
  
//   leavesMaterial = new THREE.ShaderMaterial({
//     vertexShader: grassvert,
//     fragmentShader: grassfrag,
//     uniforms: grassUniforms,
//     side: THREE.DoubleSide
//   });
//   const instanceNumber = 20000;
// const dummy = new THREE.Object3D();

// const geometry = new THREE.PlaneGeometry( 1, 1, 1, 4 );
// geometry.translate( 0, 0.5, 0 ); // move grass blade geometry lowest point at 0.
// sampler = new MeshSurfaceSampler( grassplane )
// 					.setWeightAttribute( api.distribution === 'weighted' ? 'uv' : null )
// 					.build();
// const instancedMesh = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );

// scene.add( instancedMesh );

// // Position and scale the grass blade instances randomly.

// for ( let i=0 ; i<instanceNumber ; i++ ) {

// 	dummy.position.set(
//   	( Math.random() - 0.5 ) * 10,
//     0,
//     ( Math.random() - 0.5 ) * 10
//   );
  
//   dummy.scale.setScalar( 0.5 + Math.random() * 0.5 );
  
//   dummy.rotation.y = Math.random() * Math.PI;
  
//   dummy.updateMatrix();
//   instancedMesh.setMatrixAt( i, dummy.matrix );

// }
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
      new THREE.SphereGeometry(0.05, 8, 8),
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
  container = document.getElementById("app")
  document.body.appendChild(container);

  

  const loadingManager = new THREE.LoadingManager( () => {
	
		const loadingScreen = document.getElementById( 'loading-screen' );
		loadingScreen.classList.add( 'fade-out' );
		
		// optional: remove loader from DOM via event listener
		
	} );
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  scene = new THREE.Scene();


  // scene.background = new THREE.Color(0x01000);
  //
  //scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );
  scene.fog = new THREE.Fog( new THREE.Color(0x00000), 10, 50 );

  // skyhdr.mapping = THREE.EquirectangularReflectionMapping;

  // scene.background = skyhdr;
  // scene.environment = skyhdr;





  initFireflies()
  initScreen()
  initText()
  //initGrass()
  var L1 = new THREE.PointLight(0xb887ed, 1.5);
  L1.position.z = 50;
  L1.position.y = 20;
  L1.position.x = 20;
  scene.add(L1);
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
  // // SKYDOME
  // const hemiLight = new THREE.HemisphereLight( 0x00000, 0x040611, 0.6 );

  // hemiLight.position.set( 0, 50, 0 );
  // scene.add( hemiLight );

  
  // const groundGeo = new THREE.PlaneGeometry( 10, 10 );
	// 			const groundMat = new THREE.MeshToonMaterial( { color: 0xffffff } );
	// 			groundMat.color.setHSL( 0.095, 1, 0.75 );

	// 			const ground = new THREE.Mesh( groundGeo, groundMat );
	// 			ground.position.y = - 3;
	// 			ground.rotation.x = - Math.PI / 2;
	// 			ground.receiveShadow = true;
	// 			scene.add( ground );
  
  // const uniforms = {
  //   'topColor': { value: new THREE.Color( 0x00000 ) },
  //   'bottomColor': { value: new THREE.Color( 0x040611 ) },
  //   'offset': { value: -10 },
  //   'exponent': { value: 1 }
  // };
  // uniforms[ 'topColor' ].value.copy( hemiLight.color );

  // //scene.fog.color.copy( uniforms[ 'bottomColor' ].value );

  // const skyGeo = new THREE.SphereGeometry( 40, 32, 15 );
 

  // const sky = new THREE.Mesh( skyGeo );
  // scene.add( sky );


  scene.add(main.scene);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  // renderer.useLegacyLights = true;
  renderer.alpha = true;
  renderer.setClearColor( 0x000000, 0 );

  renderer.shadowMap.enabled = true
  renderer.debug.checkShaderErrors = false;
  
  stats = new Stats();
  container.appendChild(renderer.domElement)

 
  controls = new OrbitControls(camera, container);
  container.appendChild(stats.dom);

  camera.position.copy(adscreen.position);
  camera.position.x -= 3.5;
  camTarget = new THREE.Vector3();
  gsap.to(camTarget, {
    duration: 0.1,
    x: adscreen.position.x,
    y: adscreen.position.y,
    z: adscreen.position.z,
    ease: "power1.inOut",
    paused: false
  });
  controls.target = camTarget
  // controls.target = new THREE.Vector3(0,0,0)
  
  
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

 cameraPos();
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
  window.addEventListener("mousedown", onDocumentMouseDown)

}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown( event ) {

  event.preventDefault();

  mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );

  var intersects = raycaster.intersectObjects( textarray ); 

  if ( intersects.length > 0 ) {

      intersects[0].object.callback();

  }

}
//
function cameraPos(){
  gsap.to(camera.position, {
    duration: 5,
    x: -10,
    y: 0.8,
    z: 6.2,
    delay: 2,
    ease: "power1.inOut",
    paused: false
  });
}
//
function animate() {
  requestAnimationFrame(animate);
  const delta = time.update().getDelta();
  //console.log(delta)
  // console.log()
  // leavesMaterial.uniforms.time.value = clock.getElapsedTime();
  // leavesMaterial.uniformsNeedUpdate = true;
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
