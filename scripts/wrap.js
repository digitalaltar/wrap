import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { VRButton } from 'VRButton';
import { XRControllerModelFactory } from 'XRControllerModelFactory';
import { GLTFLoader } from 'GLTFLoader';
import { MotionController } from 'MotionController';

// Define customMaterial at a higher scope
let customMaterial = new THREE.ShaderMaterial({
    // Initially, set up the shader without texture-specific uniforms
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        uniform float time; // Declare time uniform
        varying vec2 vUv;

        void main() {
            // Default color if texture is not yet loaded
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    `,
    transparent: true,
    side: THREE.BackSide
});

// Setup the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3; // Move the camera closer to the cylinder's surface

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(new THREE.Color('magenta')); // Set to a bright color for testing

// Enable WebXR on the renderer
renderer.xr.enabled = true;

// Check if WebXR is supported
if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            // WebXR is supported, show the VR button
            document.body.appendChild(VRButton.createButton(renderer));
        } else {
            // WebXR is not supported, handle accordingly
            console.warn("Immersive VR is not supported by your browser");
        }
    });
}

// Define a variable to store the camera's state
let savedCameraState = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

// Texture loader
const loader = new THREE.TextureLoader();

// Load the texture
fetch('./data.json')
  .then(response => response.json())
  .then(data => {
    const backgrounds = data.backgrounds;
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const randomBackground = backgrounds[randomIndex];

    // Load the randomly selected texture
    loader.load(randomBackground, function(texture) {
        texture.minFilter = THREE.LinearFilter;

       // Now, update the customMaterial with the loaded texture
        customMaterial.uniforms = {
            uTexture: { value: texture },
            time: { value: 0.0 },
        };
        customMaterial.fragmentShader = `
            uniform sampler2D uTexture;
            uniform float time;
            varying vec2 vUv;

            void main() {
                vec4 texColor = texture2D(uTexture, vUv);
                float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
                float pulse = sin(time) * 0.5 + 0.5; // Pulsating factor
                vec3 glow = texColor.rgb * (luminance * (1.0 + pulse)); // Apply pulsation to glow
                gl_FragColor = vec4(texColor.rgb + glow * 0.5, texColor.a); // Adjust glow intensity
            }
        `;
        customMaterial.needsUpdate = true; // Important to update the material

        // Create a cylinder geometry that the camera will be inside
        const geometry = new THREE.CylinderGeometry(10, 10, 20, 32, 1, true); // Increase the radius here
        const cylinder = new THREE.Mesh(geometry, customMaterial);
        scene.add(cylinder);
    });
  })
  .catch(error => console.error('Error loading the JSON file:', error));

// Create a geometry, material, and then mesh for the debug object
const debugGeometry = new THREE.BoxGeometry(1, 1, 1); // Create a small cube
const debugMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Initially green
const debugObject = new THREE.Mesh(debugGeometry, debugMaterial);

// Position it in front of the camera or any specific place
debugObject.position.set(0, 1.5, -2); // Adjust position as needed

// Add the debug object to your scene
scene.add(debugObject);

// Event listeners for entering and exiting VR
renderer.xr.addEventListener('sessionstart', () => {
    // Save the camera state when entering VR
    savedCameraState.position.copy(camera.position);
    savedCameraState.quaternion.copy(camera.quaternion);
});

renderer.xr.addEventListener('sessionend', () => {
    // Restore the camera state when exiting VR
    camera.position.copy(savedCameraState.position);
    camera.quaternion.copy(savedCameraState.quaternion);

    // Reset the aspect ratio and renderer size
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Re-enable and update controls if they were disabled during VR session
    controls.enabled = true;
    controls.update();
});

// Create a mesh to display the text
const textMaterial = new THREE.MeshBasicMaterial({ 
    map: createTextTexture('Controller Status: Disconnected'), // Initial text
    transparent: true, 
    side: THREE.DoubleSide 
});
const textGeometry = new THREE.PlaneGeometry(2, 0.5); // Adjust size as needed
const textMesh = new THREE.Mesh(textGeometry, textMaterial);
textMesh.position.set(0, -2, -3); // Position in front of the camera
scene.add(textMesh);

function createTextTexture(text, color = 'black') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 800; // Adjust as needed
    canvas.height = 200; // Adjust as needed

    // Set canvas background color
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    context.font = '36px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 2;

// Controller model factory
const controllerModelFactory = new XRControllerModelFactory();

// Renderer and scene must already be set up
const controller1 = renderer.xr.getController(0);
scene.add(controller1);
const controller2 = renderer.xr.getController(1);
scene.add(controller2);

// Create and add the controller models to the scene
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

// Define global variables for movement speeds for easier tweaking
const panSpeed = 0.1; // Adjust based on your needs for horizontal movement
const forwardSpeed = 0.1; // Adjust based on your needs for forward/backward movement

function handleControllerInput(controller) {
    // Immediate visual feedback
    debugObject.material.color.set('yellow');
}

controller1.addEventListener('connected', (event) => {
    textMaterial.map = createTextTexture(`Controller 1 connected with hand ${event.data.handedness}`);
    textMaterial.map.needsUpdate = true;
});

controller1.addEventListener('disconnected', () => {
    textMaterial.map = createTextTexture('Controller 1 disconnected');
    textMaterial.map.needsUpdate = true;
});

// Repeat for controller2
controller2.addEventListener('connected', (event) => {
    textMaterial.map = createTextTexture(`Controller 2 connected with hand ${event.data.handedness}`);
    textMaterial.map.needsUpdate = true;
});

controller2.addEventListener('disconnected', () => {
    textMaterial.map = createTextTexture('Controller 2 disconnected');
    textMaterial.map.needsUpdate = true;
});

function animate() {
    // Removed requestAnimationFrame(animate); We'll use renderer.setAnimationLoop instead.
    
    if (customMaterial && customMaterial.uniforms.time) {
        customMaterial.uniforms.time.value += 0.05; // Ensure this runs only after texture is loaded
    }
    
    if (renderer.xr.isPresenting) {
        handleControllerInput(controller1); // For each controller
        handleControllerInput(controller2);
    } else {
        // VR mode is not active, update OrbitControls
        controls.update();
    }

    renderer.render(scene, camera);
}

// Use this to handle the animation loop in VR mode
renderer.setAnimationLoop(animate);
