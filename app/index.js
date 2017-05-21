/*
 * Debug parameters.
 */
const WebVRConfig = {
  /**
   * webvr-polyfill configuration
   */
  // Forces availability of VR mode.
  //FORCE_ENABLE_VR: true, // Default: false.
  // Complementary filter coefficient. 0 for accelerometer, 1 for gyro.
  //K_FILTER: 0.98, // Default: 0.98.
  // How far into the future to predict during fast motion.
  //PREDICTION_TIME_S: 0.040, // Default: 0.040 (in seconds).
  // Flag to disable touch panner. In case you have your own touch controls
  //TOUCH_PANNER_DISABLED: true, // Default: false.
  // Enable yaw panning only, disabling roll and pitch. This can be useful for
  // panoramas with nothing interesting above or below.
  //YAW_ONLY: true, // Default: false.
  // Enable the deprecated version of the API (navigator.getVRDevices).
  //ENABLE_DEPRECATED_API: true, // Default: false.
  // Scales the recommended buffer size reported by WebVR, which can improve
  // performance. Making this very small can lower the effective resolution of
  // your scene.
  BUFFER_SCALE: 0.5, // default: 1.0
  // Allow VRDisplay.submitFrame to change gl bindings, which is more
  // efficient if the application code will re-bind it's resources on the
  // next frame anyway.
  // Dirty bindings include: gl.FRAMEBUFFER_BINDING, gl.CURRENT_PROGRAM,
  // gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING,
  // and gl.TEXTURE_BINDING_2D for texture unit 0
  // Warning: enabling this might lead to rendering issues.
  //DIRTY_SUBMIT_FRAME_BINDINGS: true // default: false
};

// A polyfill for Promises. Needed for IE and Edge.
import "../node_modules/es6-promise/dist/es6-promise.js";

// three.js 3d library
//import import * as THREE from 'three';
import
{
  WebGLRenderer, Scene, PointLight, PerspectiveCamera,
  MeshNormalMaterial, MeshBasicMaterial, MeshPhongMaterial, BackSide,
  BoxGeometry, Mesh, TextureLoader, 
  Color, RepeatWrapping
} from 'three';

// VRControls.js acquires positional information from connected VR devices and applies the transformations to a three.js camera object.
const VRControls = require('imports-loader?THREE=three!exports-loader?THREE.VRControls!../node_modules/three/examples/js/controls/VRControls');

// VREffect.js handles stereo camera setup and rendering.
const VREffect = require('imports-loader?THREE=three!exports-loader?THREE.VREffect!../node_modules/three/examples/js/effects/VREffect');

// VREffect.js handles stereo camera setup and rendering.
const OBJLoader = require('imports-loader?THREE=three!exports-loader?THREE.OBJLoader!../node_modules/three/examples/js/loaders/OBJLoader');

// A polyfill for WebVR using the Device{Motion,Orientation}Event API.
import "webvr-polyfill";

// A set of UI controls for entering VR mode.
import {EnterVRButton} from "webvr-ui";

// Last time the scene was rendered.
var lastRenderTime = 0;
// Currently active VRDisplay.
var vrDisplay;
// How big of a box to render.
var boxSize = 5;
// Various global THREE.Objects.
var scene;
var cube;
var controls;
var effect;
var camera;
var skybox;
// EnterVRButton for rendering enter/exit UI.
var vrButton;


function onLoad() {
  // Setup three.js WebGL renderer. Note: Antialiasing is a big performance hit.
  // Only enable it if you actually need to.
  var renderer = new WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);

  // Append the canvas element created by the renderer to document body element.
  document.body.appendChild(renderer.domElement);

  // Create a three.js scene.
  scene = new Scene();

  // Create a three.js camera.
  var aspect = window.innerWidth / window.innerHeight;
  camera = new PerspectiveCamera(75, aspect, 0.1, 10000);

  controls = new VRControls(camera);
  controls.standing = true;
  camera.position.y = controls.userHeight;

  // Apply VR stereo rendering to renderer.
  effect = new VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  // Add a repeating grid as a skybox.
  var loader = new TextureLoader();
  loader.load('img/box.png', onTextureLoaded);

  addLight();
  // addCube();
  addTeapot();

  window.addEventListener('resize', onResize, true);
  window.addEventListener('vrdisplaypresentchange', onResize, true);

  // Initialize the WebVR UI.
  var uiOptions = {
    color: 'black',
    background: 'white',
    corners: 'square'
  };
  vrButton = new EnterVRButton(renderer.domElement, uiOptions);
  vrButton.on('exit', function() {
    camera.quaternion.set(0, 0, 0, 1);
    camera.position.set(0, controls.userHeight, 0);
  });
  vrButton.on('hide', function() {
    document.getElementById('ui').style.display = 'none';
  });
  vrButton.on('show', function() {
    document.getElementById('ui').style.display = 'inherit';
  });
  document.getElementById('vr-button').appendChild(vrButton.domElement);
  document.getElementById('magic-window').addEventListener('click', function() {
    // vrButton.requestEnterVR();
    vrButton.requestEnterFullscreen();
  });
}

function onTextureLoaded(texture) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(boxSize, boxSize);

  var geometry = new BoxGeometry(boxSize, boxSize, boxSize);
  var material = new MeshBasicMaterial({
    map: texture,
    color: 0x01BE00,
    side: BackSide
  });

  // Align the skybox to the floor (which is at y=0).
  skybox = new Mesh(geometry, material);
  skybox.position.y = boxSize/2;
  scene.add(skybox);

  // For high end VR devices like Vive and Oculus, take into account the stage
  // parameters provided.
  setupStage();
}

function addCube() {
  // Create 3D objects.
  var geometry = new BoxGeometry(0.5, 0.5, 0.5);
  var material = new MeshNormalMaterial();
  cube = new Mesh(geometry, material);

  // Position cube mesh to be right in front of you.
  cube.position.set(0, controls.userHeight, -1);

  // Add cube mesh to your three.js scene
  scene.add(cube);
}

function addLight() {
  var light = new PointLight( 0xff22ff, 1, 0, 2);
  light.position.set( -1, 1, 0 );
  scene.add( light );

  var light = new PointLight( 0x22ffff, 1, 0, 2);
  light.position.set( 1, 3, 0 );
  scene.add( light );
}

function addTeapot() {
  var loader = new OBJLoader();

  // load a resource
  loader.load(
    // resource URL
    'models/wt_teapot.obj',
    // Function when resource is loaded
    function ( teapotObject ) {

      for (var i in teapotObject.children) {
          teapotObject.children[i].material = new MeshPhongMaterial({color: new Color(0x85cbcf)});
      }

      teapotObject.scale.set(0.5, 0.5, 0.5);
      scene.add( teapotObject );
      teapotObject.position.set(0, controls.userHeight - 0.2, -1);
      cube = teapotObject
    }
  );  
}

// Request animation frame loop function
function animate(timestamp) {
  var delta = Math.min(timestamp - lastRenderTime, 500);
  lastRenderTime = timestamp;

  // Apply rotation to cube mesh
  if (cube != undefined)
    cube.rotation.y += delta * 0.0006;

  // Only update controls if we're presenting.
  if (vrButton.isPresenting()) {
    controls.update();
  }
  // Render the scene.
  effect.render(scene, camera);

  vrDisplay.requestAnimationFrame(animate);
}

function onResize(e) {
  effect.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Get the HMD, and if we're dealing with something that specifies
// stageParameters, rearrange the scene.
function setupStage() {  
  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      vrDisplay = displays[0];
      if (vrDisplay.stageParameters) {
        setStageDimensions(vrDisplay.stageParameters);
      }
      vrDisplay.requestAnimationFrame(animate);
    }
  });
}

function setStageDimensions(stage) {
  // Make the skybox fit the stage.
  var material = skybox.material;
  scene.remove(skybox);

  // Size the skybox according to the size of the actual stage.
  var geometry = new BoxGeometry(stage.sizeX, boxSize, stage.sizeZ);
  skybox = new Mesh(geometry, material);

  // Place it on the floor.
  skybox.position.y = boxSize/2;
  scene.add(skybox);

  // Place the cube in the middle of the scene, at user height.
  cube.position.set(0, controls.userHeight, 0);
}

window.addEventListener('load', onLoad);
