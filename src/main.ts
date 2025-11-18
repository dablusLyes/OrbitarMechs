import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PhysicsEngine } from './Physics.js';
import { CelestialBody } from './Body.js';
import { InputHandler } from './Input.js';
import { UIManager } from './UI.js';
import './style.css';

/**
 * Main application class
 */
class PlanetSimulation {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.composer = null;
    this.physics = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.bodies = [];
    this.clock = new THREE.Clock();

    this.init();
    this.createStarfield();
    this.createInitialBodies();
    this.animate();
  }

  /**
   * Initialize Three.js scene, camera, renderer
   */
  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 50, 50);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    document.body.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // Post-processing for bloom
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(bloomPass);

    // Physics engine
    this.physics = new PhysicsEngine(1.0);

    // Input handler
    this.inputHandler = new InputHandler(this.camera, this.renderer.domElement, this.scene);
    this.inputHandler.onSelectionChange = (body) => {
      this.uiManager.selectBody(body);
    };

    // UI Manager
    this.uiManager = new UIManager();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Create starfield background
   */
  createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 400;
      positions[i + 1] = (Math.random() - 0.5) * 400;
      positions[i + 2] = (Math.random() - 0.5) * 400;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  /**
   * Create initial celestial bodies
   */
  createInitialBodies() {
    // Central star
    const star = new CelestialBody({
      name: 'Sun',
      mass: 100,
      radius: 3,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.5,
      isStatic: false
    });
    this.addBody(star);

    // Planet 1 - Close orbit
    const planet1 = new CelestialBody({
      name: 'Mercury',
      mass: 1,
      radius: 0.8,
      position: new THREE.Vector3(15, 0, 0),
      velocity: new THREE.Vector3(0, 0, 2.5),
      color: 0x8c7853,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    this.addBody(planet1);

    // Planet 2 - Medium orbit
    const planet2 = new CelestialBody({
      name: 'Earth',
      mass: 2,
      radius: 1.2,
      position: new THREE.Vector3(25, 0, 0),
      velocity: new THREE.Vector3(0, 0, 2.0),
      color: 0x2233ff,
      emissive: 0x001144,
      emissiveIntensity: 0.2
    });
    this.addBody(planet2);

    // Planet 3 - Far orbit
    const planet3 = new CelestialBody({
      name: 'Jupiter',
      mass: 5,
      radius: 2.0,
      position: new THREE.Vector3(40, 0, 0),
      velocity: new THREE.Vector3(0, 0, 1.5),
      color: 0xffaa44,
      emissive: 0x442200,
      emissiveIntensity: 0.1
    });
    this.addBody(planet3);

    // Small moon for Earth
    const moon = new CelestialBody({
      name: 'Moon',
      mass: 0.3,
      radius: 0.4,
      position: new THREE.Vector3(28, 0, 0),
      velocity: new THREE.Vector3(0, 0, 2.8),
      color: 0xaaaaaa,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    this.addBody(moon);
  }

  /**
   * Add a celestial body to the simulation
   */
  addBody(body) {
    this.bodies.push(body);
    this.scene.add(body.mesh);
    body.initTrail(this.scene);
    this.physics.addBody(body);
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    const settings = this.uiManager.getSettings();

    // Update physics
    if (!settings.paused) {
      const deltaTime = this.clock.getDelta();
      const scaledDeltaTime = deltaTime * settings.timeScale;

      // Update gravitational constant
      this.physics.G = settings.gravitationalConstant;

      // Run physics simulation
      this.physics.update(scaledDeltaTime);

      // Update meshes and trails
      for (const body of this.bodies) {
        body.updateMesh();
        if (settings.showTrails) {
          body.updateTrail();
        }
      }
    }

    // Update controls
    this.controls.update();

    // Render with post-processing
    this.composer.render();
  }
}

// Start the simulation
new PlanetSimulation();
