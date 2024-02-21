import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

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
renderer.setClearColor(0x000000); // Set background color

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

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 2;

function animate() {
    requestAnimationFrame(animate);

    if (customMaterial && customMaterial.uniforms.time) {
        customMaterial.uniforms.time.value += 0.05; // Ensure this runs only after texture is loaded
    }
    
    // Update controls
    controls.update();

    renderer.render(scene, camera);
}


animate();
