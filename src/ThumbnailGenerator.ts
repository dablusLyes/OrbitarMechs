import * as THREE from 'three';
import type { CelestialBody } from './Body.js';

/**
 * Cache for generated thumbnails
 */
const thumbnailCache = new Map<string, string>();

/**
 * Utility class for generating thumbnails of 3D models
 */
export class ThumbnailGenerator {
  private static renderer: THREE.WebGLRenderer | null = null;
  private static scene: THREE.Scene | null = null;
  private static camera: THREE.PerspectiveCamera | null = null;
  private static light: THREE.DirectionalLight | null = null;

  /**
   * Initialize the thumbnail renderer (lazy initialization)
   */
  private static initializeRenderer(): void {
    if (this.renderer) return;

    // Create offscreen renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(256, 256);
    this.renderer.setPixelRatio(1);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background

    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    this.light = new THREE.DirectionalLight(0xffffff, 0.8);
    this.light.position.set(5, 5, 5);
    this.scene.add(this.light);
  }

  /**
   * Generate a thumbnail for a single celestial body
   */
  static async generateBodyThumbnail(body: CelestialBody): Promise<string> {
    const cacheKey = `body_${body.name}_${body.color}_${body.radius}_${body.mass}`;

    // Check cache
    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)!;
    }

    this.initializeRenderer();

    // Create a clone of the body's mesh for rendering
    const geometry = new THREE.SphereGeometry(body.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: body.color,
      emissive: body.emissive,
      emissiveIntensity: body.emissiveIntensity,
      metalness: 0.3,
      roughness: 0.7
    });

    // Copy textures if they exist
    if (body.texture) {
      material.map = body.texture.clone();
    }
    if (body.normalMap) {
      material.normalMap = body.normalMap.clone();
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.scene!.add(mesh);

    // Center the camera on the object
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    this.camera!.position.set(center.x, center.y, center.z + distance);
    this.camera!.lookAt(center);

    // Render
    this.renderer!.render(this.scene!, this.camera!);

    // Get data URL
    const dataUrl = this.renderer!.domElement.toDataURL('image/png');

    // Cleanup
    this.scene!.remove(mesh);
    geometry.dispose();
    material.dispose();
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();

    // Cache result
    thumbnailCache.set(cacheKey, dataUrl);

    return dataUrl;
  }

  /**
   * Generate a thumbnail for a system (multiple bodies)
   */
  static async generateSystemThumbnail(bodies: CelestialBody[]): Promise<string> {
    if (bodies.length === 0) {
      // Return empty thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      return canvas.toDataURL('image/png');
    }

    const cacheKey = `system_${bodies.length}_${bodies.map(b => b.name).join('_')}`;

    // Check cache
    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)!;
    }

    this.initializeRenderer();

    // Create meshes for all bodies
    const meshes: THREE.Mesh[] = [];
    for (const body of bodies) {
      const geometry = new THREE.SphereGeometry(body.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: body.color,
        emissive: body.emissive,
        emissiveIntensity: body.emissiveIntensity,
        metalness: 0.3,
        roughness: 0.7
      });

      if (body.texture) {
        material.map = body.texture.clone();
      }
      if (body.normalMap) {
        material.normalMap = body.normalMap.clone();
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(body.position);
      this.scene!.add(mesh);
      meshes.push(mesh);
    }

    // Calculate bounding box for all bodies
    const box = new THREE.Box3();
    meshes.forEach(mesh => box.expandByObject(mesh));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;

    this.camera!.position.set(center.x, center.y, center.z + distance);
    this.camera!.lookAt(center);

    // Render
    this.renderer!.render(this.scene!, this.camera!);

    // Get data URL
    const dataUrl = this.renderer!.domElement.toDataURL('image/png');

    // Cleanup
    meshes.forEach(mesh => {
      this.scene!.remove(mesh);
      mesh.geometry.dispose();
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.dispose();
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
    });

    // Cache result
    thumbnailCache.set(cacheKey, dataUrl);

    return dataUrl;
  }

  /**
   * Generate thumbnail from premade body data (without creating actual body)
   */
  static async generatePremadeBodyThumbnail(data: {
    name: string;
    type: 'planet' | 'star';
    mass: number;
    radius: number;
    color: number;
    emissive: number;
    emissiveIntensity: number;
  }): Promise<string> {
    const cacheKey = `premade_${data.name}_${data.color}_${data.radius}`;

    // Check cache
    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)!;
    }

    this.initializeRenderer();

    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.emissive,
      emissiveIntensity: data.emissiveIntensity,
      metalness: 0.3,
      roughness: 0.7
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene!.add(mesh);

    // Center camera
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    this.camera!.position.set(center.x, center.y, center.z + distance);
    this.camera!.lookAt(center);

    // Render
    this.renderer!.render(this.scene!, this.camera!);

    // Get data URL
    const dataUrl = this.renderer!.domElement.toDataURL('image/png');

    // Cleanup
    this.scene!.remove(mesh);
    geometry.dispose();
    material.dispose();

    // Cache result
    thumbnailCache.set(cacheKey, dataUrl);

    return dataUrl;
  }

  /**
   * Clear the thumbnail cache
   */
  static clearCache(): void {
    thumbnailCache.clear();
  }

  /**
   * Dispose of renderer resources
   */
  static dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.light = null;
    this.clearCache();
  }
}

