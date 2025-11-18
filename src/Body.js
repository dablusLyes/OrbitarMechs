import * as THREE from 'three';

/**
 * Represents a celestial body (planet or star) in the simulation
 */
export class CelestialBody {
  constructor(options = {}) {
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

    // Create mesh
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
  updateMesh() {
    this.mesh.position.copy(this.position);
  }

  /**
   * Update visual properties
   */
  updateVisuals() {
    this.material.color.setHex(this.color);
    this.material.emissive.setHex(this.emissive);
    this.material.emissiveIntensity = this.emissiveIntensity;
  }

  /**
   * Initialize trail rendering
   */
  initTrail(scene) {
    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });

    this.trail = new THREE.Line(trailGeometry, trailMaterial);
    this.trail.frustumCulled = false;
    scene.add(this.trail);
  }

  /**
   * Update trail with current position
   */
  updateTrail() {
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
    const positions = this.trail.geometry.attributes.position.array;
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
  clearTrail() {
    this.trailPoints = [];
    if (this.trail) {
      this.trail.geometry.setDrawRange(0, 0);
    }
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.trail) {
      this.trail.geometry.dispose();
      this.trail.material.dispose();
    }
  }
}
