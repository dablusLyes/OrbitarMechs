# Planet Simulation Tutorial

A comprehensive walkthrough of the Antigravity Planet Simulation project - an interactive 3D N-body gravitational physics simulator built with Three.js and TypeScript.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Core Components Deep Dive](#core-components-deep-dive)
   - [Physics Engine](#physics-engine)
   - [Celestial Body](#celestial-body)
   - [Input Handler](#input-handler)
   - [UI Manager](#ui-manager)
   - [Main Application](#main-application)
6. [Data Flow and Interactions](#data-flow-and-interactions)
7. [Key Concepts Explained](#key-concepts-explained)
8. [Running the Project](#running-the-project)
9. [Customization Guide](#customization-guide)

---

## Project Overview

This project is an **interactive 3D N-body gravitational simulation** that allows you to:
- Visualize celestial bodies (planets, stars, moons) orbiting each other
- Interact with bodies by clicking and dragging them
- Adjust physical properties in real-time through a UI panel
- Control simulation parameters like time scale and gravitational constant
- View orbital trails to visualize paths

The simulation uses **Newtonian physics** with gravitational forces calculated between all bodies, creating realistic orbital mechanics.

---

## Project Structure

```
antigravity/
├── index.html              # Entry HTML file
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── main.ts            # Main application entry point
│   ├── Physics.ts         # Physics engine for gravitational calculations
│   ├── Body.ts            # Celestial body class
│   ├── Input.ts           # Mouse interaction handler
│   ├── UI.ts              # UI panel manager (Tweakpane)
│   └── style.css          # Global styles
└── dist/                  # Built output (generated)
```

---

## Technology Stack

### Core Libraries

1. **Three.js (v0.181.1)**
   - 3D graphics rendering
   - Scene, camera, renderer setup
   - Mesh creation and manipulation
   - Post-processing effects (bloom)

2. **TypeScript (v5.9.3)**
   - Type safety
   - Modern ES2022 features
   - Strict mode enabled

3. **Tweakpane (v4.0.5)**
   - Real-time parameter adjustment UI
   - Property binding and change callbacks

4. **Vite (v7.2.2)**
   - Fast development server
   - Hot module replacement
   - Production bundling

### Key Three.js Extensions Used

- **OrbitControls**: Camera rotation and zoom
- **EffectComposer**: Post-processing pipeline
- **RenderPass**: Base rendering pass
- **UnrealBloomPass**: Bloom effect for glowing stars

---

## Architecture Overview

The project follows a **modular architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         PlanetSimulation                │
│  (Main Application Coordinator)         │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Physics │ │ Input  │ │   UI   │
│Engine  │ │Handler │ │Manager │
└────┬───┘ └───┬────┘ └───┬────┘
     │        │          │
     └────────┼──────────┘
             │
             ▼
      ┌──────────────┐
      │CelestialBody │
      │  (Multiple)  │
      └──────────────┘
```

### Component Responsibilities

- **PlanetSimulation**: Orchestrates all components, manages the render loop
- **PhysicsEngine**: Calculates gravitational forces and updates positions
- **CelestialBody**: Represents a single celestial body with physics and visuals
- **InputHandler**: Handles mouse interactions (selection, dragging)
- **UIManager**: Provides real-time property editing interface

---

## Core Components Deep Dive

### Physics Engine

**File**: `src/Physics.ts`

The physics engine implements **N-body gravitational simulation** using Newton's law of universal gravitation.

#### Key Properties

```typescript
class PhysicsEngine {
  G: number;              // Gravitational constant (adjustable)
  bodies: CelestialBody[]; // Array of all bodies in simulation
}
```

#### Core Methods

##### 1. `calculateGravityForce(body1, body2)`

Calculates the gravitational force between two bodies using:

**F = G × (m₁ × m₂) / r²**

```typescript
calculateGravityForce(body1: CelestialBody, body2: CelestialBody): THREE.Vector3 {
  // Calculate direction vector from body1 to body2
  const direction = new THREE.Vector3().subVectors(body2.position, body1.position);
  const distanceSquared = direction.lengthSq();

  // Prevent division by zero and extreme forces
  const minDistance = 0.1;
  const clampedDistanceSquared = Math.max(distanceSquared, minDistance * minDistance);

  // Calculate force magnitude
  const forceMagnitude = this.G * (body1.mass * body2.mass) / clampedDistanceSquared;

  // Return force vector (direction normalized and scaled)
  return direction.normalize().multiplyScalar(forceMagnitude);
}
```

**Important Safety Features**:
- **Minimum distance clamping**: Prevents infinite forces when bodies are too close
- **Collision handling**: If bodies overlap (distance < 0.001), applies a small random separation force

##### 2. `calculateTotalForce(body)`

Sums gravitational forces from all other bodies:

```typescript
calculateTotalForce(body: CelestialBody): THREE.Vector3 {
  const totalForce = new THREE.Vector3(0, 0, 0);

  for (const otherBody of this.bodies) {
    if (otherBody === body) continue; // Skip self
    const force = this.calculateGravityForce(body, otherBody);
    totalForce.add(force);
  }

  return totalForce;
}
```

##### 3. `update(deltaTime)` - Symplectic Euler Integration

This is the **heart of the physics simulation**. Uses **Symplectic Euler** integration, which is superior to standard Euler for orbital mechanics because it **better conserves energy**.

**Why Symplectic Euler?**
- Standard Euler: `v(t+dt) = v(t) + a(t)×dt`, then `x(t+dt) = x(t) + v(t)×dt`
- Symplectic Euler: `v(t+dt) = v(t) + a(t)×dt`, then `x(t+dt) = x(t) + v(t+dt)×dt`

The key difference: uses the **new velocity** to update position, which maintains energy conservation better.

```typescript
update(deltaTime: number): void {
  // Step 1: Calculate all forces first (using current positions)
  const forces = new Map<CelestialBody, THREE.Vector3>();
  for (const body of this.bodies) {
    forces.set(body, this.calculateTotalForce(body));
  }

  // Step 2: Update velocities using forces
  // v_new = v_old + a × dt, where a = F/m
  for (const body of this.bodies) {
    if (body.isStatic) continue; // Skip static bodies

    const force = forces.get(body)!;
    const acceleration = force.clone().divideScalar(body.mass);
    body.velocity.add(acceleration.multiplyScalar(deltaTime));
  }

  // Step 3: Update positions using NEW velocities
  // x_new = x_old + v_new × dt
  for (const body of this.bodies) {
    if (body.isStatic) continue;

    const displacement = body.velocity.clone().multiplyScalar(deltaTime);
    body.position.add(displacement);
  }
}
```

**Integration Flow**:
1. Calculate forces for all bodies (based on current positions)
2. Update velocities (v = v + a×dt)
3. Update positions (x = x + v_new×dt) ← Uses NEW velocity

##### 4. `getTotalEnergy()` - Energy Conservation Check

Calculates total system energy (kinetic + potential) for debugging:

```typescript
getTotalEnergy(): number {
  let kineticEnergy = 0;
  let potentialEnergy = 0;

  // KE = 0.5 × m × v²
  for (const body of this.bodies) {
    kineticEnergy += 0.5 * body.mass * body.velocity.lengthSq();
  }

  // PE = -G × m₁ × m₂ / r (for each pair)
  for (let i = 0; i < this.bodies.length; i++) {
    for (let j = i + 1; j < this.bodies.length; j++) {
      const distance = this.bodies[i].position.distanceTo(this.bodies[j].position);
      potentialEnergy -= this.G * this.bodies[i].mass * this.bodies[j].mass / Math.max(distance, 0.1);
    }
  }

  return kineticEnergy + potentialEnergy;
}
```

---

### Celestial Body

**File**: `src/Body.ts`

Represents a single celestial body (planet, star, moon) with both **physical properties** (mass, position, velocity) and **visual properties** (color, size, material).

#### Properties Structure

```typescript
class CelestialBody {
  // Physical Properties
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isStatic: boolean;  // If true, body doesn't move (fixed in space)

  // Visual Properties
  radius: number;
  color: number;              // Hex color (0xffffff)
  emissive: number;           // Emissive color for glow
  emissiveIntensity: number;   // How much it glows (0-2)
  name: string;

  // Three.js Objects
  geometry: THREE.SphereGeometry;
  material: THREE.MeshStandardMaterial;
  mesh: THREE.Mesh;  // The actual 3D object in the scene

  // Trail System
  trail: THREE.Line | null;
  trailPoints: THREE.Vector3[];
  maxTrailPoints: number;
  trailUpdateCounter: number;
  trailUpdateInterval: number;
}
```

#### Constructor

Creates a body from options with sensible defaults:

```typescript
constructor(options: CelestialBodyOptions = {}) {
  // Set physical properties (with defaults)
  this.mass = options.mass || 1.0;
  this.position = options.position || new THREE.Vector3(0, 0, 0);
  this.velocity = options.velocity || new THREE.Vector3(0, 0, 0);
  this.isStatic = options.isStatic || false;

  // Set visual properties
  this.radius = options.radius || 1.0;
  this.color = options.color || 0xffffff;
  this.emissive = options.emissive || 0x000000;
  this.emissiveIntensity = options.emissiveIntensity || 0.0;
  this.name = options.name || 'Body';

  // Create Three.js mesh
  this.geometry = new THREE.SphereGeometry(this.radius, 32, 32);
  this.material = new THREE.MeshStandardMaterial({
    color: this.color,
    emissive: this.emissive,
    emissiveIntensity: this.emissiveIntensity,
    metalness: 0.3,
    roughness: 0.7
  });
  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.position.copy(this.position);

  // Store reference for raycasting
  this.mesh.userData.body = this;
}
```

**Key Points**:
- Uses `MeshStandardMaterial` for realistic lighting
- `userData.body` stores reference for mouse picking
- 32x32 sphere segments for smooth appearance

#### Trail System

The trail system visualizes orbital paths by storing position history.

##### `initTrail(scene)`

Creates the trail line object:

```typescript
initTrail(scene: THREE.Scene): void {
  // Create buffer geometry with pre-allocated positions
  const trailGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(this.maxTrailPoints * 3); // x,y,z for each point
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Create line material
  const trailMaterial = new THREE.LineBasicMaterial({
    color: this.color,
    transparent: true,
    opacity: 0.6,
    linewidth: 1
  });

  // Create line object
  this.trail = new THREE.Line(trailGeometry, trailMaterial);
  this.trail.frustumCulled = false; // Always render, even if off-screen
  scene.add(this.trail);
}
```

##### `updateTrail()`

Updates the trail with current position (called every few frames for performance):

```typescript
updateTrail(): void {
  if (!this.trail) return;

  // Only update every N frames (performance optimization)
  this.trailUpdateCounter++;
  if (this.trailUpdateCounter < this.trailUpdateInterval) return;
  this.trailUpdateCounter = 0;

  // Add current position to trail
  this.trailPoints.push(this.position.clone());

  // Limit trail length (FIFO queue)
  if (this.trailPoints.length > this.maxTrailPoints) {
    this.trailPoints.shift();
  }

  // Update geometry buffer
  const positions = this.trail.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < this.maxTrailPoints; i++) {
    if (i < this.trailPoints.length) {
      // Use actual trail point
      const point = this.trailPoints[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    } else {
      // Fill remaining with last point (prevents visual artifacts)
      const lastPoint = this.trailPoints[this.trailPoints.length - 1] || this.position;
      positions[i * 3] = lastPoint.x;
      positions[i * 3 + 1] = lastPoint.y;
      positions[i * 3 + 2] = lastPoint.z;
    }
  }

  // Mark geometry as needing update
  this.trail.geometry.attributes.position.needsUpdate = true;
  this.trail.geometry.setDrawRange(0, this.trailPoints.length);
}
```

**Performance Optimizations**:
- Updates every 3 frames (not every frame)
- Pre-allocated buffer (no memory allocation during runtime)
- Uses `setDrawRange` to only render active points

#### Other Methods

- **`updateMesh()`**: Syncs mesh position with physics position
- **`updateVisuals()`**: Updates material colors when properties change
- **`clearTrail()`**: Clears the trail (useful when dragging)
- **`dispose()`**: Cleans up Three.js resources (prevents memory leaks)

---

### Input Handler

**File**: `src/Input.ts`

Handles mouse interactions: **selecting** bodies by clicking and **dragging** them around.

#### Core Concepts

##### Raycasting

Uses Three.js `Raycaster` to determine what object is under the mouse cursor:

```typescript
getBodyUnderMouse(): CelestialBody | null {
  // Convert mouse screen coordinates to normalized device coordinates (-1 to 1)
  this.raycaster.setFromCamera(this.mouse, this.camera);

  // Find all objects the ray intersects
  const intersects = this.raycaster.intersectObjects(this.scene.children, true);

  // Find first object with a body reference
  for (const intersect of intersects) {
    if (intersect.object.userData.body) {
      return intersect.object.userData.body as CelestialBody;
    }
  }

  return null;
}
```

**How it works**:
1. Mouse position is converted to normalized device coordinates (-1 to 1)
2. Raycaster creates a ray from camera through that point
3. Checks intersection with all scene objects
4. Returns the first body found

##### Drag Plane

When dragging, the body moves along a **plane perpendicular to the camera view direction**:

```typescript
onMouseDown(event: MouseEvent): void {
  const body = this.getBodyUnderMouse();

  if (body) {
    // Create plane perpendicular to camera direction
    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.camera.getWorldDirection(new THREE.Vector3()).negate(), // Plane normal
      body.position  // Point on plane
    );

    // Calculate offset between body position and mouse intersection
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    this.dragOffset.subVectors(body.position, intersection);

    this.isDragging = true;
  }
}
```

**Why a plane?**
- Prevents the body from jumping toward/away from camera
- Makes dragging feel natural and predictable
- Body stays at consistent depth relative to camera

##### Drag Update

During mouse move while dragging:

```typescript
onMouseMove(event: MouseEvent): void {
  if (this.isDragging && this.selectedBody) {
    // Update raycaster with new mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Find intersection with drag plane
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      // Apply offset and update body position
      this.selectedBody.position.copy(intersection.add(this.dragOffset));
      this.selectedBody.updateMesh();

      // Clear trail (body was manually moved)
      this.selectedBody.clearTrail();
    }
  }
}
```

#### Event Flow

1. **Mouse Down**: Detect body under cursor → Create drag plane → Start dragging
2. **Mouse Move**: Update body position along drag plane → Update mesh → Clear trail
3. **Mouse Up**: Stop dragging
4. **Selection Change**: Notify UI manager to show body properties

---

### UI Manager

**File**: `src/UI.ts`

Manages the **Tweakpane** UI panel for real-time property editing.

#### Settings Structure

```typescript
interface Settings {
  timeScale: number;              // Speed multiplier (0.1 - 5.0)
  gravitationalConstant: number;   // G value (0.1 - 10.0)
  showTrails: boolean;             // Toggle trail visibility
  paused: boolean;                 // Pause simulation
}
```

#### Global Controls

Created once at initialization:

```typescript
setupGlobalControls(): void {
  this.globalFolder = this.pane.addFolder({
    title: 'Global Settings',
    expanded: true
  });

  // Time scale slider
  this.globalFolder.addBinding(this.settings, 'timeScale', {
    label: 'Time Scale',
    min: 0.1,
    max: 5.0,
    step: 0.1
  });

  // Gravitational constant slider
  this.globalFolder.addBinding(this.settings, 'gravitationalConstant', {
    label: 'Gravity (G)',
    min: 0.1,
    max: 10.0,
    step: 0.1
  });

  // Toggles
  this.globalFolder.addBinding(this.settings, 'showTrails', {
    label: 'Show Trails'
  });

  this.globalFolder.addBinding(this.settings, 'paused', {
    label: 'Paused'
  });
}
```

#### Body-Specific Controls

Created dynamically when a body is selected:

```typescript
selectBody(body: CelestialBody | null): void {
  // Remove previous body folder
  if (this.bodyFolder) {
    this.bodyFolder.dispose();
    this.bodyFolder = null;
  }

  if (!body) return;

  // Create new folder for selected body
  this.bodyFolder = this.pane.addFolder({
    title: `Selected: ${body.name}`,
    expanded: true
  });

  // Bind properties with change callbacks
  this.bodyFolder.addBinding(body, 'mass', {
    label: 'Mass',
    min: 0.1,
    max: 1000,
    step: 0.1
  });

  // Radius with geometry update callback
  this.bodyFolder.addBinding(body, 'radius', {
    label: 'Radius',
    min: 0.1,
    max: 10,
    step: 0.1
  }).on('change', () => {
    // Update geometry when radius changes
    body.geometry.dispose();
    body.geometry = new THREE.SphereGeometry(body.radius, 32, 32);
    body.mesh.geometry = body.geometry;
  });

  // Color with visual update callback
  this.bodyFolder.addBinding(body, 'color', {
    label: 'Color',
    view: 'color'
  }).on('change', () => {
    body.updateVisuals();
  });

  // ... more bindings for position, velocity, etc.
}
```

**Key Features**:
- **Two-way binding**: UI changes update object, object changes update UI
- **Change callbacks**: Trigger actions when properties change (e.g., update geometry)
- **Nested folders**: Position and velocity in collapsible sub-folders
- **Dynamic creation**: Body folder created/destroyed on selection

---

### Main Application

**File**: `src/main.ts`

The `PlanetSimulation` class orchestrates all components and manages the render loop.

#### Initialization Sequence

```typescript
constructor() {
  // Initialize properties
  this.scene = null;
  this.camera = null;
  // ... etc

  // Setup sequence
  this.init();              // 1. Create Three.js scene, camera, renderer
  this.createStarfield();   // 2. Add background stars
  this.createInitialBodies(); // 3. Create initial planets
  this.animate();           // 4. Start render loop
}
```

#### `init()` - Three.js Setup

##### Scene

```typescript
this.scene = new THREE.Scene();
this.scene.background = new THREE.Color(0x000510); // Dark blue space color
```

##### Camera

```typescript
this.camera = new THREE.PerspectiveCamera(
  75,                                    // Field of view (degrees)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                                   // Near clipping plane
  1000                                    // Far clipping plane
);
this.camera.position.set(0, 50, 50);    // Position above and back
```

##### Renderer

```typescript
this.renderer = new THREE.WebGLRenderer({ antialias: true });
this.renderer.setSize(window.innerWidth, window.innerHeight);
this.renderer.setPixelRatio(window.devicePixelRatio); // High DPI support
this.renderer.toneMapping = THREE.ReinhardToneMapping; // HDR tone mapping
document.body.appendChild(this.renderer.domElement);
```

##### Orbit Controls

```typescript
this.controls = new OrbitControls(this.camera, this.renderer.domElement);
this.controls.enableDamping = true;      // Smooth camera movement
this.controls.dampingFactor = 0.05;
this.controls.minDistance = 5;           // Can't zoom too close
this.controls.maxDistance = 200;         // Can't zoom too far
```

**Controls**:
- **Left click + drag**: Rotate camera
- **Right click + drag**: Pan camera
- **Scroll wheel**: Zoom in/out

##### Lighting

```typescript
// Ambient light (fills shadows)
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
this.scene.add(ambientLight);

// Directional light (simulates sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
this.scene.add(directionalLight);
```

##### Post-Processing (Bloom Effect)

Creates a glowing effect for stars:

```typescript
// Create post-processing composer
this.composer = new EffectComposer(this.renderer);

// Base render pass
const renderPass = new RenderPass(this.scene, this.camera);
this.composer.addPass(renderPass);

// Bloom pass (makes bright objects glow)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,   // Strength
  0.4,   // Radius
  0.85   // Threshold (brightness level to start glowing)
);
this.composer.addPass(bloomPass);
```

**Bloom Effect**:
- Objects with high emissive intensity glow
- Makes stars look more realistic
- Threshold: only objects brighter than 0.85 glow

#### `createStarfield()`

Creates a random starfield background:

```typescript
createStarfield() {
  const starCount = 5000;
  const positions = new Float32Array(starCount * 3);

  // Generate random positions
  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 400;     // x
    positions[i + 1] = (Math.random() - 0.5) * 400; // y
    positions[i + 2] = (Math.random() - 0.5) * 400; // z
  }

  // Create points geometry
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Create points material
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0.8
  });

  // Create and add to scene
  const stars = new THREE.Points(starGeometry, starMaterial);
  this.scene.add(stars);
}
```

**Performance**: Uses `Points` instead of individual meshes (much faster for thousands of objects).

#### `createInitialBodies()`

Creates the default solar system:

1. **Sun** (central star)
   - Mass: 100
   - Radius: 3
   - Position: (0, 0, 0)
   - High emissive intensity (glows)

2. **Mercury** (close orbit)
   - Mass: 1
   - Radius: 0.8
   - Position: (15, 0, 0)
   - Velocity: (0, 0, 2.5) - circular orbit velocity

3. **Earth** (medium orbit)
   - Mass: 2
   - Radius: 1.2
   - Position: (25, 0, 0)
   - Velocity: (0, 0, 2.0)

4. **Jupiter** (far orbit)
   - Mass: 5
   - Radius: 2.0
   - Position: (40, 0, 0)
   - Velocity: (0, 0, 1.5)

5. **Moon** (orbits Earth)
   - Mass: 0.3
   - Radius: 0.4
   - Position: (28, 0, 0)
   - Velocity: (0, 0, 2.8)

**Orbital Velocity Calculation**:
For circular orbits, velocity ≈ √(G × M / r), where:
- G = gravitational constant
- M = central body mass
- r = orbital radius

#### Animation Loop

The heart of the application - runs every frame:

```typescript
animate(): void {
  requestAnimationFrame(() => this.animate()); // Schedule next frame

  const settings = this.uiManager!.getSettings();

  // Update physics (if not paused)
  if (!settings.paused) {
    const deltaTime = this.clock.getDelta(); // Time since last frame
    const scaledDeltaTime = deltaTime * settings.timeScale; // Apply time scale

    // Update gravitational constant from UI
    this.physics!.G = settings.gravitationalConstant;

    // Run physics simulation
    this.physics!.update(scaledDeltaTime);

    // Update visual representations
    for (const body of this.bodies) {
      body.updateMesh(); // Sync mesh position with physics position

      if (settings.showTrails) {
        body.updateTrail(); // Update orbital trails
      }
    }
  }

  // Update camera controls (smooth damping)
  this.controls!.update();

  // Render with post-processing
  this.composer!.render();
}
```

**Frame-by-Frame Flow**:
1. Get settings from UI
2. If not paused:
   - Calculate delta time
   - Apply time scale
   - Update physics (forces, velocities, positions)
   - Update meshes and trails
3. Update camera controls
4. Render scene with post-processing
5. Schedule next frame

**Performance**: Uses `requestAnimationFrame` for smooth 60 FPS rendering.

---

## Data Flow and Interactions

### Component Communication

```
User Input (Mouse)
    ↓
InputHandler
    ├─→ Updates CelestialBody.position (when dragging)
    └─→ Calls UIManager.selectBody() (on selection)
            ↓
        UIManager
            ├─→ Updates CelestialBody properties (via UI bindings)
            └─→ Returns Settings (timeScale, G, etc.)
                    ↓
                Main Loop
                    ↓
            PhysicsEngine.update()
                    ↓
            Calculates forces → Updates velocities → Updates positions
                    ↓
            CelestialBody.updateMesh() (syncs visual with physics)
                    ↓
            Renderer renders scene
```

### Property Updates

**UI → Body**:
- User changes property in UI panel
- Tweakpane binding updates body property
- Change callback triggers (e.g., `updateVisuals()`)

**Body → Physics**:
- Body position/velocity changed (via UI or dragging)
- Physics engine reads these values on next `update()`
- Forces recalculated based on new positions

**Physics → Body**:
- Physics engine updates `body.position` and `body.velocity`
- `body.updateMesh()` syncs visual mesh

---

## Key Concepts Explained

### 1. N-Body Problem

The **N-body problem** is calculating the motion of N objects under gravitational influence. For N > 2, there's no closed-form solution, so we use **numerical integration**.

**Our approach**:
- Calculate force between every pair of bodies: O(N²) complexity
- Use Symplectic Euler integration for stability
- Update positions/velocities in small time steps

### 2. Gravitational Force

**Newton's Law of Universal Gravitation**:

F = G × (m₁ × m₂) / r²

Where:
- **F**: Force magnitude
- **G**: Gravitational constant (6.674×10⁻¹¹ in real world, adjustable in sim)
- **m₁, m₂**: Masses of the two bodies
- **r**: Distance between bodies

**Force is a vector**, so we:
1. Calculate direction (normalized vector from body1 to body2)
2. Calculate magnitude (using formula above)
3. Return direction × magnitude

### 3. Numerical Integration

**Problem**: We know forces, but need to find positions over time.

**Solution**: Numerical integration - approximate continuous motion with discrete steps.

**Symplectic Euler**:
```
v(t+dt) = v(t) + a(t) × dt
x(t+dt) = x(t) + v(t+dt) × dt  ← Uses NEW velocity
```

**Why better than standard Euler?**
- Standard Euler: `x(t+dt) = x(t) + v(t) × dt` (uses old velocity)
- Symplectic Euler conserves energy better (important for orbits)
- Orbits stay stable longer without energy drift

### 4. Coordinate Systems

**Three.js uses right-handed coordinate system**:
- **X**: Right
- **Y**: Up
- **Z**: Toward camera (initially)

**Camera setup**:
- Positioned at (0, 50, 50) - above and behind origin
- Looks toward origin (0, 0, 0)
- OrbitControls allows rotation around origin

### 5. Raycasting

**Purpose**: Determine what 3D object is under the mouse cursor.

**Process**:
1. Convert mouse screen coordinates (pixels) to normalized device coordinates (-1 to 1)
2. Create ray from camera through that point
3. Check intersection with all scene objects
4. Return closest intersection

**Used for**: Body selection and drag plane intersection.

### 6. Post-Processing Pipeline

**EffectComposer** allows multiple rendering passes:

1. **RenderPass**: Renders scene normally
2. **UnrealBloomPass**: Adds glow to bright objects
   - Threshold: Only objects brighter than this glow
   - Strength: How much they glow
   - Radius: Size of glow effect

**Result**: Stars and bright objects have a realistic glow effect.

---

## Running the Project

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (with hot reload)
npm run dev
```

Opens at `http://localhost:5173` (or similar port).

### Build

```bash
# Build for production
npm run build
```

Output in `dist/` directory.

### Preview Production Build

```bash
# Preview production build
npm run preview
```

---

## Customization Guide

### Adding a New Body

In `main.ts`, `createInitialBodies()`:

```typescript
const newPlanet = new CelestialBody({
  name: 'Saturn',
  mass: 3,
  radius: 1.8,
  position: new THREE.Vector3(50, 0, 0),
  velocity: new THREE.Vector3(0, 0, 1.2),
  color: 0xffd700,
  emissive: 0x442200,
  emissiveIntensity: 0.1
});
this.addBody(newPlanet);
```

### Adjusting Physics

**Change gravitational constant**:
- Use UI slider (Global Settings → Gravity (G))
- Or modify `new PhysicsEngine(1.0)` in `main.ts`

**Change integration method**:
- Modify `PhysicsEngine.update()` method
- Could implement Runge-Kutta 4 for higher accuracy (but slower)

### Visual Customization

**Starfield**:
- Modify `createStarfield()` in `main.ts`
- Change `starCount`, `size`, `opacity`

**Bloom effect**:
- Modify `UnrealBloomPass` parameters in `main.ts`
- Strength: 1.5 (how much glow)
- Radius: 0.4 (glow size)
- Threshold: 0.85 (brightness to start glowing)

**Camera**:
- Modify `camera.position.set()` in `init()`
- Adjust `controls.minDistance` and `maxDistance`

### Performance Tuning

**Reduce body count**: Fewer bodies = faster physics (O(N²) complexity)

**Optimize trail updates**: Increase `trailUpdateInterval` in `Body.ts`

**Reduce star count**: Lower `starCount` in `createStarfield()`

**Disable bloom**: Remove `bloomPass` from composer (faster rendering)

---

## Advanced Topics

### Energy Conservation

The `getTotalEnergy()` method can be used to monitor energy conservation:

```typescript
// In animation loop, log energy
console.log(this.physics.getTotalEnergy());
```

**Expected behavior**: Energy should remain relatively constant (small fluctuations due to numerical errors).

### Collision Detection

Currently, bodies can overlap. To add collision detection:

1. Check distance between bodies in `PhysicsEngine.update()`
2. If distance < (radius1 + radius2), apply collision response
3. Could use elastic collision (conserves momentum) or inelastic (bodies stick)

### Multi-Threading

Physics calculations are CPU-intensive. For many bodies, consider:

- **Web Workers**: Run physics in separate thread
- **Spatial partitioning**: Only calculate forces for nearby bodies
- **Barnes-Hut algorithm**: Approximate distant bodies as single mass

### Saving/Loading Scenarios

Add serialization:

```typescript
// Save
const scenario = {
  bodies: this.bodies.map(b => ({
    name: b.name,
    mass: b.mass,
    position: { x: b.position.x, y: b.position.y, z: b.position.z },
    velocity: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z },
    // ... other properties
  }))
};
localStorage.setItem('scenario', JSON.stringify(scenario));

// Load
const saved = JSON.parse(localStorage.getItem('scenario'));
// Recreate bodies from saved data
```

---

## Troubleshooting

### Bodies Disappear

- Check camera position (might be inside a body)
- Verify bodies are added to scene: `this.scene.add(body.mesh)`

### Physics Unstable

- Reduce `timeScale` (smaller time steps = more stable)
- Increase minimum distance in `calculateGravityForce()`
- Check for bodies with same position (causes infinite force)

### Poor Performance

- Reduce number of bodies
- Increase `trailUpdateInterval`
- Disable bloom effect
- Reduce star count

### UI Not Appearing

- Check browser console for errors
- Verify Tweakpane is imported correctly
- Check CSS (`.tp-dfwv` should be visible)

---

## Conclusion

This project demonstrates:

1. **3D Graphics**: Three.js scene setup, rendering, post-processing
2. **Physics Simulation**: N-body gravitational dynamics, numerical integration
3. **User Interaction**: Mouse picking, dragging, real-time property editing
4. **TypeScript**: Type-safe code with modern features
5. **Modular Architecture**: Clean separation of concerns

**Key Takeaways**:
- Symplectic Euler integration is crucial for stable orbits
- Raycasting enables intuitive 3D interaction
- Post-processing adds visual polish
- Modular design makes code maintainable and extensible

**Next Steps**:
- Add more bodies or create custom scenarios
- Experiment with different integration methods
- Add collision detection
- Implement save/load functionality
- Optimize for many bodies (spatial partitioning)

Happy simulating! 🚀

