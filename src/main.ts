import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PhysicsEngine } from './Physics.js';
import { CelestialBody } from './Body.js';
import { InputHandler } from './Input.js';
import { UIManager } from './UI.js';
import { ModeManager, InteractionMode } from './ModeManager.js';
import { Toolbar } from './Toolbar.js';
import { UndoManager, UndoOperationType } from './UndoManager.js';
import { SystemBuilder } from './SystemBuilder.js';
import './style.css';

/**
 * Main application class
 */
class PlanetSimulation {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  composer: EffectComposer | null;
  physics: PhysicsEngine | null;
  inputHandler: InputHandler | null;
  uiManager: UIManager | null;
  modeManager: ModeManager | null;
  toolbar: Toolbar | null;
  undoManager: UndoManager | null;
  systemBuilder: SystemBuilder | null;
  bodies: CelestialBody[];
  clock: THREE.Clock;

  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.composer = null;
    this.physics = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.modeManager = null;
    this.toolbar = null;
    this.undoManager = null;
    this.systemBuilder = null;
    this.bodies = [];
    this.clock = new THREE.Clock();

    this.init();
    this.createStarfield();
    // Create initial bodies without recording for undo (they're part of initial state)
    this.createInitialBodies(false);
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
    // Position camera further back to see the wider orbits
    this.camera.position.set(0, 100, 120);

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
    this.controls.minDistance = 10;
    this.controls.maxDistance = 400;

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

    // Undo manager
    this.undoManager = new UndoManager(50);

    // Mode manager
    this.modeManager = new ModeManager(InteractionMode.Camera);
    this.modeManager.onModeChange((mode) => {
      this.onModeChange(mode);
    });

    // Input handler
    this.inputHandler = new InputHandler(this.camera, this.renderer.domElement, this.scene);
    this.inputHandler.onSelectionChange = (body: CelestialBody | null) => {
      this.uiManager!.selectBody(body);
    };
    this.inputHandler.onDeleteRequest = (body: CelestialBody) => {
      this.deleteBody(body);
    };
    this.inputHandler.setMode(this.modeManager.currentMode);

    // UI Manager
    this.uiManager = new UIManager();

    // Toolbar
    this.toolbar = new Toolbar(this.modeManager);

    // System Builder
    this.systemBuilder = new SystemBuilder();
    this.systemBuilder.setOnAddBody((body: CelestialBody) => {
      this.addBody(body);
    });
    this.systemBuilder.setOnLoadSystem((bodies: CelestialBody[]) => {
      this.loadSystem({ bodies: bodies.map(b => b.toJSON()) }, false);
    });
    this.systemBuilder.setOnGetCurrentBodies(() => {
      return this.bodies;
    });

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Handle mode changes
   */
  onModeChange(mode: InteractionMode): void {
    // Update OrbitControls based on mode
    if (this.controls) {
      this.controls.enabled = mode === InteractionMode.Camera;
    }

    // Update input handler mode
    if (this.inputHandler) {
      this.inputHandler.setMode(mode);
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (event) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Mode switching shortcuts
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        this.modeManager!.setMode(InteractionMode.Camera);
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'g' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        this.modeManager!.setMode(InteractionMode.Grab);
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        this.modeManager!.setMode(InteractionMode.Delete);
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'e' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        this.modeManager!.setMode(InteractionMode.Edit);
        event.preventDefault();
      }

      // Delete key (when in Delete mode or when body is selected)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (this.inputHandler && this.inputHandler.selectedBody) {
          this.deleteBody(this.inputHandler.selectedBody);
          event.preventDefault();
        }
      }

      // Undo/Redo shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        this.undo();
        event.preventDefault();
      } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        this.redo();
        event.preventDefault();
      }
    });
  }

  /**
   * Delete a body from the simulation
   * @param body The body to delete
   * @param recordUndo Whether to record this deletion for undo (default: true)
   */
  deleteBody(body: CelestialBody, recordUndo: boolean = true): void {
    // Record deletion for undo
    if (recordUndo) {
      const bodyIndex = this.bodies.indexOf(body);
      if (bodyIndex > -1) {
        this.undoManager!.recordRemoveBody(body, bodyIndex);
      }
    }

    // Remove from bodies array
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }

    // Remove from scene
    if (this.scene) {
      this.scene.remove(body.mesh);
      if (body.trail) {
        this.scene.remove(body.trail);
      }
    }

    // Remove from physics engine
    if (this.physics) {
      this.physics.removeBody(body);
    }

    // Dispose of body resources
    body.dispose();

    // Remove from undo manager ID map (only if recording undo, to preserve ID for restoration)
    if (recordUndo) {
      this.undoManager!.removeBodyId(body);
    }

    // Deselect if this was the selected body
    if (this.inputHandler && this.inputHandler.selectedBody === body) {
      this.inputHandler.deselect();
      if (this.uiManager) {
        this.uiManager.selectBody(null);
      }
    }
  }

  /**
   * Undo the last operation
   */
  undo(): void {
    if (!this.undoManager || !this.undoManager.canUndo()) {
      return;
    }

    const operation = this.undoManager.undo(this.bodies);
    if (!operation) return;

    if (operation.type === UndoOperationType.AddBody) {
      // Undo add: remove the body (don't record for undo since it's already in the stack)
      const body = this.undoManager.findBodyById(this.bodies, operation.bodySnapshot.id);
      if (body) {
        this.deleteBody(body, false);
      }
    } else if (operation.type === UndoOperationType.RemoveBody) {
      // Undo remove: restore the body
      const restoredBody = this.undoManager.createBodyFromSnapshot(operation.bodySnapshot);
      this.bodies.splice(operation.bodyIndex || this.bodies.length, 0, restoredBody);
      this.scene!.add(restoredBody.mesh);
      restoredBody.initTrail(this.scene!);
      this.physics!.addBody(restoredBody);
    } else if (operation.type === UndoOperationType.ModifyBody) {
      // Undo modify: restore body properties
      const body = this.undoManager.findBodyById(this.bodies, operation.bodySnapshot.id);
      if (body) {
        body.name = operation.bodySnapshot.name;
        body.mass = operation.bodySnapshot.mass;
        body.radius = operation.bodySnapshot.radius;
        body.position.set(
          operation.bodySnapshot.position.x,
          operation.bodySnapshot.position.y,
          operation.bodySnapshot.position.z
        );
        body.velocity.set(
          operation.bodySnapshot.velocity.x,
          operation.bodySnapshot.velocity.y,
          operation.bodySnapshot.velocity.z
        );
        body.color = operation.bodySnapshot.color;
        body.emissive = operation.bodySnapshot.emissive;
        body.emissiveIntensity = operation.bodySnapshot.emissiveIntensity;
        body.isStatic = operation.bodySnapshot.isStatic;
        body.updateMesh();
        body.updateVisuals();
      }
    }
  }

  /**
   * Redo the last undone operation
   */
  redo(): void {
    if (!this.undoManager || !this.undoManager.canRedo()) {
      return;
    }

    const operation = this.undoManager.redo(this.bodies);
    if (!operation) return;

    // Redo is the inverse of undo
    if (operation.type === UndoOperationType.AddBody) {
      // Redo add: add the body back (don't record for undo since it's already in the stack)
      const restoredBody = this.undoManager.createBodyFromSnapshot(operation.bodySnapshot);
      this.bodies.push(restoredBody);
      this.scene!.add(restoredBody.mesh);
      restoredBody.initTrail(this.scene!);
      this.physics!.addBody(restoredBody);
    } else if (operation.type === UndoOperationType.RemoveBody) {
      // Redo remove: delete the body (don't record for undo since it's already in the stack)
      const body = this.undoManager.findBodyById(this.bodies, operation.bodySnapshot.id);
      if (body) {
        this.deleteBody(body, false);
      }
    } else if (operation.type === UndoOperationType.ModifyBody) {
      // Redo modify: this would require storing the "after" state
      // For now, we'll skip redo for modifications
    }
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
    this.scene!.add(stars);
  }

  /**
   * Create initial celestial bodies
   * @param recordUndo Whether to record additions for undo (default: true)
   */
  createInitialBodies(recordUndo: boolean = true) {
    const G = this.physics!.G;
    const sunMass = 100;

    // Central star - make it static to stabilize orbits
    const star = new CelestialBody({
      name: 'Sun',
      mass: sunMass,
      radius: 3,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.5,
      isStatic: true // Static sun for stable orbits
    });
    this.addBody(star, recordUndo);

    // Calculate exact orbital velocities for circular orbits
    // v = sqrt(G * M / r) for circular orbit around central mass M at distance r

    // Planet 1 - Close orbit (Mercury) - increased distance
    const mercuryRadius = 30;
    const mercuryVelocity = Math.sqrt(G * sunMass / mercuryRadius);
    const planet1 = new CelestialBody({
      name: 'Mercury',
      mass: 1,
      radius: 0.8,
      position: new THREE.Vector3(mercuryRadius, 0, 0),
      velocity: new THREE.Vector3(0, 0, mercuryVelocity),
      color: 0x8c7853,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    this.addBody(planet1, recordUndo);

    // Planet 2 - Medium orbit (Earth) - increased distance
    const earthRadius = 50;
    const earthVelocity = Math.sqrt(G * sunMass / earthRadius);
    const planet2 = new CelestialBody({
      name: 'Earth',
      mass: 2,
      radius: 1.2,
      position: new THREE.Vector3(earthRadius, 0, 0),
      velocity: new THREE.Vector3(0, 0, earthVelocity),
      color: 0x2233ff,
      emissive: 0x001144,
      emissiveIntensity: 0.2
    });
    this.addBody(planet2, recordUndo);

    // Planet 3 - Far orbit (Jupiter) - increased distance
    const jupiterRadius = 80;
    const jupiterVelocity = Math.sqrt(G * sunMass / jupiterRadius);
    const planet3 = new CelestialBody({
      name: 'Jupiter',
      mass: 5,
      radius: 2.0,
      position: new THREE.Vector3(jupiterRadius, 0, 0),
      velocity: new THREE.Vector3(0, 0, jupiterVelocity),
      color: 0xffaa44,
      emissive: 0x442200,
      emissiveIntensity: 0.1
    });
    this.addBody(planet3, recordUndo);

    // Small moon for Earth - orbit around Earth, not Sun
    // For moon orbiting Earth: v = sqrt(G * earthMass / moonRadius)
    // But we need to account for Earth's orbital velocity too
    const earthMass = 2;
    const moonRadiusFromEarth = 5; // Distance from Earth (increased)
    const moonOrbitalVelocity = Math.sqrt(G * earthMass / moonRadiusFromEarth);
    const moon = new CelestialBody({
      name: 'Moon',
      mass: 0.3,
      radius: 0.4,
      position: new THREE.Vector3(earthRadius + moonRadiusFromEarth, 0, 0),
      // Moon's velocity = Earth's orbital velocity + moon's orbital velocity around Earth
      velocity: new THREE.Vector3(0, 0, earthVelocity + moonOrbitalVelocity),
      color: 0xaaaaaa,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    this.addBody(moon, recordUndo);
  }

  /**
   * Add a celestial body to the simulation
   * @param body The body to add
   * @param recordUndo Whether to record this addition for undo (default: true)
   */
  addBody(body: CelestialBody, recordUndo: boolean = true): void {
    this.bodies.push(body);
    this.scene!.add(body.mesh);
    body.initTrail(this.scene!);
    this.physics!.addBody(body);

    // Record addition for undo
    if (recordUndo && this.undoManager) {
      this.undoManager.recordAddBody(body);
    }
  }

  /**
   * Handle window resize
   */
  onWindowResize(): void {
    this.camera!.aspect = window.innerWidth / window.innerHeight;
    this.camera!.updateProjectionMatrix();
    this.renderer!.setSize(window.innerWidth, window.innerHeight);
    this.composer!.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Serialize current system state for saving
   */
  serializeSystem(): any {
    return {
      bodies: this.bodies.map(body => body.toJSON()),
      timestamp: Date.now()
    };
  }

  /**
   * Load system from serialized data
   * @param systemData Serialized system data
   * @param recordUndo Whether to record this as an undoable operation
   */
  loadSystem(systemData: { bodies: any[] }, recordUndo: boolean = true): void {
    // Clear current system
    const bodiesToRemove = [...this.bodies];
    bodiesToRemove.forEach(body => {
      this.deleteBody(body, false); // Don't record undo for clearing
    });

    // Load new bodies
    for (const bodyData of systemData.bodies) {
      const body = new CelestialBody({
        name: bodyData.name,
        mass: bodyData.mass,
        radius: bodyData.radius,
        position: new THREE.Vector3(bodyData.position.x, bodyData.position.y, bodyData.position.z),
        velocity: new THREE.Vector3(bodyData.velocity.x, bodyData.velocity.y, bodyData.velocity.z),
        color: bodyData.color,
        emissive: bodyData.emissive,
        emissiveIntensity: bodyData.emissiveIntensity,
        isStatic: bodyData.isStatic,
        textureUrl: bodyData.textureUrl,
        normalMapUrl: bodyData.normalMapUrl
      });

      // Load textures if URLs are provided
      if (bodyData.textureUrl && !bodyData.textureUrl.startsWith('blob:')) {
        body.loadTexture(bodyData.textureUrl).catch(err => {
          console.error('Failed to load texture:', err);
        });
      }
      if (bodyData.normalMapUrl && !bodyData.normalMapUrl.startsWith('blob:')) {
        body.loadNormalMap(bodyData.normalMapUrl).catch(err => {
          console.error('Failed to load normal map:', err);
        });
      }

      this.addBody(body, recordUndo);
    }
  }

  /**
   * Animation loop
   */
  animate(): void {
    requestAnimationFrame(() => this.animate());

    const settings = this.uiManager!.getSettings();

    // Update physics
    if (!settings.paused) {
      const deltaTime = this.clock.getDelta();
      const scaledDeltaTime = deltaTime * settings.timeScale;

      // Update gravitational constant
      this.physics!.G = settings.gravitationalConstant;

      // Update Barnes-Hut settings
      this.physics!.useBarnesHut = settings.useBarnesHut;
      this.physics!.barnesHutTheta = settings.barnesHutTheta;

      // Run physics simulation
      this.physics!.update(scaledDeltaTime);

      // Update meshes and trails
      for (const body of this.bodies) {
        body.updateMesh();
        if (settings.showTrails) {
          body.updateTrail();
        }
      }
    }

    // Update controls
    this.controls!.update();

    // Render with post-processing
    this.composer!.render();
  }
}

// Start the simulation
new PlanetSimulation();
