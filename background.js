// ===== Three.js Background Logic =====

let scene, camera, renderer;
let particles;
let mouseX = 0, mouseY = 0;

// Theme configuration
const THEMES = {
    day: {
        fog: 0xbae6fd,
        fogDensity: 0.015,
        particleColor: 0xffffff, // Pollen/Dust
        particleSize: 0.05,
        lightIntensity: 1.2
    },
    night: {
        fog: 0x020617,
        fogDensity: 0.02,
        particleColor: 0xbef264, // Fireflies
        particleSize: 0.08,
        lightIntensity: 0.4
    }
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    const canvas = document.getElementById('bg-canvas');

    // Scene Setup
    scene = new THREE.Scene();

    const isDay = document.body.classList.contains('day-mode');
    const theme = isDay ? THEMES.day : THEMES.night;

    // Fog
    const color = new THREE.Color(theme.fog);
    scene.fog = new THREE.FogExp2(color, theme.fogDensity);

    // No background color set in Three.js so CSS background shows through
    // scene.background = null; 

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent

    // Objects
    createParticles(theme);
    addLights(theme);

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Observer for Body Class Changes (Theme Toggle)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                updateTheme();
            }
        });
    });
    observer.observe(document.body, { attributes: true });

    // Animation Loop
    animate();
}

function createParticles(theme) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 60;
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 60;
        vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: theme.particleColor,
        size: theme.particleSize,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function addLights(theme) {
    const ambientLight = new THREE.AmbientLight(0xffffff, theme.lightIntensity);
    ambientLight.name = 'ambient';
    scene.add(ambientLight);
}

function updateTheme() {
    const isDay = document.body.classList.contains('day-mode');
    const theme = isDay ? THEMES.day : THEMES.night;

    const color = new THREE.Color(theme.fog);
    if (scene.fog) scene.fog.color.set(color);
    if (scene.fog) scene.fog.density = theme.fogDensity;

    particles.material.color.setHex(theme.particleColor);
    particles.material.size = theme.particleSize;

    const ambient = scene.getObjectByName('ambient');
    if (ambient) ambient.intensity = theme.lightIntensity;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
}

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.0005;

    // Gentle camera movement
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    if (particles) {
        particles.rotation.y = time * 0.05;
        if (document.body.classList.contains('night-mode')) {
            particles.material.size = 0.08 + Math.sin(time * 3) * 0.03;
        } else {
            particles.material.size = 0.05;
        }
    }

    renderer.render(scene, camera);
}
