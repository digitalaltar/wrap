import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

// Setup the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3; // Move the camera closer to the cylinder's surface

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x000000); // Set background color

// Load the texture
const loader = new THREE.TextureLoader();
const texture = loader.load('./assets/background.png', function(texture) {
    texture.minFilter = THREE.LinearFilter; // This can help with handling the texture's mipmapping
    cylinder.material = customMaterial; // Apply the custom material to the cylinder after the texture has loaded
});

const customMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTexture: { value: texture },
        time: { value: 0.0 }, // Add time uniform
    },
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
            vec4 texColor = texture2D(uTexture, vUv);
            float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            float pulse = sin(time) * 0.5 + 0.5; // Pulsating factor between 0 and 1
            vec3 glow = texColor.rgb * (luminance * (1.0 + pulse)); // Apply pulsation to glow
            gl_FragColor = vec4(texColor.rgb + glow * 0.5, texColor.a); // Adjust glow intensity here
        }
    `,
    transparent: true,
    side: THREE.BackSide
});
// Create a cylinder geometry that the camera will be inside
const geometry = new THREE.CylinderGeometry(10, 10, 20, 32, 1, true); // Increase the radius here
const cylinder = new THREE.Mesh(geometry, customMaterial);
scene.add(cylinder);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 2;

function animate() {
    requestAnimationFrame(animate);

    customMaterial.uniforms.time.value += 0.05; // Adjust the speed of pulsation

    // Update controls
    controls.update();

    renderer.render(scene, camera);
}

animate();
