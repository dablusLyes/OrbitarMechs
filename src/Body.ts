import * as THREE from 'three';

export interface CelestialBodyOptions {
  name?: string;
  mass?: number;
  radius?: number;
  position?: THREE.Vector3;
  velocity?: THREE.Vector3;
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  isStatic?: boolean;
  textureUrl?: string;
  normalMapUrl?: string;
  texture?: THREE.Texture;
  normalMap?: THREE.Texture;
}

/**
 * Represents a celestial body (planet or star) in the simulation
 */
export class CelestialBody {
  // Physical properties
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isStatic: boolean;

  // Visual properties
  radius: number;
  color: number;
  emissive: number;
  emissiveIntensity: number;
  name: string;

  // Three.js objects
  geometry: THREE.SphereGeometry;
  material: THREE.MeshStandardMaterial;
  mesh: THREE.Mesh;

  // Textures
  texture: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  textureUrl: string | null;
  normalMapUrl: string | null;

  // Trail for visualizing orbit
  trail: THREE.Line | null;
  trailPoints: THREE.Vector3[];
  maxTrailPoints: number;
  trailUpdateCounter: number;
  trailUpdateInterval: number;

  constructor(options: CelestialBodyOptions = {}) {
    // Physical properties
    this.mass = options.mass || 1.0;
    this.position = options.position || new THREE.Vector3(0, 0, 0);
    this.velocity = options.velocity || new THREE.Vector3(0, 0, 0);
    this.isStatic = options.isStatic || false;

    // Visual properties
    this.radius = options.radius || 1.0;
    this.color = options.color || 0xffffff;
    this.emissive = options.emissive || 0x000000;
    this.emissiveIntensity = options.emissiveIntensity || 0.0;
    this.name = options.name || 'Body';

    // Textures
    this.texture = options.texture || null;
    this.normalMap = options.normalMap || null;
    this.textureUrl = options.textureUrl || null;
    this.normalMapUrl = options.normalMapUrl || null;

    // Create mesh
    this.geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.emissive,
      emissiveIntensity: this.emissiveIntensity,
      metalness: 0.3,
      roughness: 0.7
    });

    // Apply textures if provided
    if (this.texture) {
      this.material.map = this.texture;
      this.material.needsUpdate = true;
    }
    if (this.normalMap) {
      this.material.normalMap = this.normalMap;
      this.material.needsUpdate = true;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
    this.mesh.userData.body = this; // Reference back to this body

    // Trail for visualizing orbit
    this.trail = null;
    this.trailPoints = [];
    this.maxTrailPoints = 500;
    this.trailUpdateCounter = 0;
    this.trailUpdateInterval = 3; // Update trail every N frames
  }

  /**
   * Update the mesh position to match physics position
   */
  updateMesh(): void {
    this.mesh.position.copy(this.position);
  }

  /**
   * Update visual properties
   */
  updateVisuals(): void {
    this.material.color.setHex(this.color);
    this.material.emissive.setHex(this.emissive);
    this.material.emissiveIntensity = this.emissiveIntensity;

    // Update textures if they exist
    if (this.texture) {
      this.material.map = this.texture;
    }
    if (this.normalMap) {
      this.material.normalMap = this.normalMap;
    }
    this.material.needsUpdate = true;

    // Update trail color to match body color
    if (this.trail && this.trail.material instanceof THREE.ShaderMaterial) {
      const r = ((this.color >> 16) & 255) / 255;
      const g = ((this.color >> 8) & 255) / 255;
      const b = (this.color & 255) / 255;
      this.trail.material.uniforms.color.value.set(r, g, b);
    }
  }

  /**
   * Load texture from URL or file
   */
  async loadTexture(url: string | File): Promise<void> {
    const loader = new THREE.TextureLoader();

    if (url instanceof File) {
      // Load from file
      const objectUrl = URL.createObjectURL(url);
      try {
        this.texture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(objectUrl, resolve, undefined, reject);
        });
        this.textureUrl = objectUrl;
        this.material.map = this.texture;
        this.material.needsUpdate = true;
      } catch (error) {
        console.error('Failed to load texture:', error);
        URL.revokeObjectURL(objectUrl);
      }
    } else {
      // Load from URL
      this.texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      this.textureUrl = url;
      this.material.map = this.texture;
      this.material.needsUpdate = true;
    }
  }

  /**
   * Load normal map from URL or file
   */
  async loadNormalMap(url: string | File): Promise<void> {
    const loader = new THREE.TextureLoader();

    if (url instanceof File) {
      // Load from file
      const objectUrl = URL.createObjectURL(url);
      try {
        this.normalMap = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(objectUrl, resolve, undefined, reject);
        });
        this.normalMapUrl = objectUrl;
        this.material.normalMap = this.normalMap;
        this.material.needsUpdate = true;
      } catch (error) {
        console.error('Failed to load normal map:', error);
        URL.revokeObjectURL(objectUrl);
      }
    } else {
      // Load from URL
      this.normalMap = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      this.normalMapUrl = url;
      this.material.normalMap = this.normalMap;
      this.material.needsUpdate = true;
    }
  }

  /**
   * Remove texture
   */
  removeTexture(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    if (this.textureUrl && this.textureUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.textureUrl);
    }
    this.textureUrl = null;
    this.material.map = null;
    this.material.needsUpdate = true;
  }

  /**
   * Remove normal map
   */
  removeNormalMap(): void {
    if (this.normalMap) {
      this.normalMap.dispose();
      this.normalMap = null;
    }
    if (this.normalMapUrl && this.normalMapUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.normalMapUrl);
    }
    this.normalMapUrl = null;
    this.material.normalMap = null;
    this.material.needsUpdate = true;
  }

  /**
   * Initialize trail rendering with glowing effect
   */
  initTrail(scene: THREE.Scene): void {
    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Convert hex color to RGB for shader
    const r = ((this.color >> 16) & 255) / 255;
    const g = ((this.color >> 8) & 255) / 255;
    const b = (this.color & 255) / 255;

    // Create a shader material that outputs bright colors for bloom
    // This ensures trails glow with the planet's color
    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Vector3(r, g, b) },
        opacity: { value: 0.9 }
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        void main() {
          // Output bright color to trigger bloom (threshold is 0.85)
          // Multiply by 2.0 to ensure it's bright enough
          gl_FragColor = vec4(color * 2.0, opacity);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.trail = new THREE.Line(trailGeometry, trailMaterial);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = -1; // Render before other objects

    scene.add(this.trail);
  }

  /**
   * Update trail with current position
   */
  updateTrail(): void {
    if (!this.trail) return;

    this.trailUpdateCounter++;
    if (this.trailUpdateCounter < this.trailUpdateInterval) return;
    this.trailUpdateCounter = 0;

    // Add current position to trail
    this.trailPoints.push(this.position.clone());

    // Limit trail length
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.shift();
    }

    // Update trail geometry
    const positions = this.trail.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.maxTrailPoints; i++) {
      if (i < this.trailPoints.length) {
        const point = this.trailPoints[i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      } else {
        // Fill remaining with last point to avoid artifacts
        const lastPoint = this.trailPoints[this.trailPoints.length - 1] || this.position;
        positions[i * 3] = lastPoint.x;
        positions[i * 3 + 1] = lastPoint.y;
        positions[i * 3 + 2] = lastPoint.z;
      }
    }

    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.setDrawRange(0, this.trailPoints.length);
  }

  /**
   * Clear the trail
   */
  clearTrail(): void {
    this.trailPoints = [];
    if (this.trail) {
      this.trail.geometry.setDrawRange(0, 0);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();

    // Dispose textures
    if (this.texture) {
      this.texture.dispose();
    }
    if (this.normalMap) {
      this.normalMap.dispose();
    }
    if (this.textureUrl && this.textureUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.textureUrl);
    }
    if (this.normalMapUrl && this.normalMapUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.normalMapUrl);
    }

    if (this.trail) {
      this.trail.geometry.dispose();
      const material = this.trail.material;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    }
  }

  /**
   * Serialize body to JSON-compatible object
   */
  toJSON(): any {
    return {
      name: this.name,
      type: this.isStatic && this.emissiveIntensity > 0 ? 'star' : 'planet',
      mass: this.mass,
      radius: this.radius,
      color: this.color,
      emissive: this.emissive,
      emissiveIntensity: this.emissiveIntensity,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z
      },
      isStatic: this.isStatic,
      textureUrl: this.textureUrl,
      normalMapUrl: this.normalMapUrl
    };
  }
}

