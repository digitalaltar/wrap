import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { VRButton } from 'VRButton';

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

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 2;

// Renderer and scene must already be set up
const controller1 = renderer.xr.getController(0);
scene.add(controller1);

// This function will be called every frame to check controller input
function handleControllerInput() {
    const gamepad = controller1.gamepad;

    if (gamepad && gamepad.axes.length >= 2) {
        // VR controller joysticks typically have at least two axes:
        // axes[0]: Left (-1) to Right (1)
        // axes[1]: Down (-1) to Up (1)

        const pan = gamepad.axes[0]; // Horizontal movement for panning
        const zoom = gamepad.axes[1]; // Vertical movement for zooming

        // Apply the pan - adjust camera or scene based on pan value
        // For example, moving the camera left or right
        camera.position.x += pan * panSpeed; // panSpeed is a value you define for sensitivity

        // Apply the zoom - move the camera in or out based on zoom value
        // This simulates zooming by changing the camera's position along the Z-axis
        camera.position.z += zoom * zoomSpeed; // zoomSpeed controls how fast the zoom happens
    }
}

function animate() {
    // Removed requestAnimationFrame(animate); We'll use renderer.setAnimationLoop instead.
    
    if (customMaterial && customMaterial.uniforms.time) {
        customMaterial.uniforms.time.value += 0.05; // Ensure this runs only after texture is loaded
    }
    
    if (renderer.xr.isPresenting) {
        // VR mode is active, skip OrbitControls update
        handleControllerInput();
    } else {
        // VR mode is not active, update OrbitControls
        controls.update();
    }

    renderer.render(scene, camera);
}

// Use this to handle the animation loop in VR mode
renderer.setAnimationLoop(animate);