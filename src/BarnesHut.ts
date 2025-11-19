import * as THREE from 'three';
import type { CelestialBody } from './Body.js';

/**
 * Represents a node in the Barnes-Hut octree
 */
class BHNode {
  centerOfMass: THREE.Vector3;
  totalMass: number;
  body: CelestialBody | null;
  children: (BHNode | null)[];
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  isEmpty: boolean;

  constructor(bounds: { min: THREE.Vector3; max: THREE.Vector3 }) {
    this.centerOfMass = new THREE.Vector3();
    this.totalMass = 0;
    this.body = null;
    this.children = new Array(8).fill(null);
    this.bounds = bounds;
    this.isEmpty = true;
  }

  /**
   * Get the center of the bounding box
   */
  getCenter(): THREE.Vector3 {
    return new THREE.Vector3(
      (this.bounds.min.x + this.bounds.max.x) / 2,
      (this.bounds.min.y + this.bounds.max.y) / 2,
      (this.bounds.min.z + this.bounds.max.z) / 2
    );
  }

  /**
   * Get the size of the bounding box
   */
  getSize(): number {
    const dx = this.bounds.max.x - this.bounds.min.x;
    const dy = this.bounds.max.y - this.bounds.min.y;
    const dz = this.bounds.max.z - this.bounds.min.z;
    return Math.max(dx, dy, dz);
  }

  /**
   * Check if a point is within the bounds
   */
  contains(position: THREE.Vector3): boolean {
    return (
      position.x >= this.bounds.min.x && position.x <= this.bounds.max.x &&
      position.y >= this.bounds.min.y && position.y <= this.bounds.max.y &&
      position.z >= this.bounds.min.z && position.z <= this.bounds.max.z
    );
  }

  /**
   * Get the octant index for a position (0-7)
   */
  getOctant(position: THREE.Vector3): number {
    const center = this.getCenter();
    let index = 0;
    if (position.x >= center.x) index |= 1;
    if (position.y >= center.y) index |= 2;
    if (position.z >= center.z) index |= 4;
    return index;
  }

  /**
   * Create a child node for a specific octant
   */
  createChild(octant: number): BHNode {
    const center = this.getCenter();

    const min = new THREE.Vector3(
      (octant & 1) ? center.x : this.bounds.min.x,
      (octant & 2) ? center.y : this.bounds.min.y,
      (octant & 4) ? center.z : this.bounds.min.z
    );

    const max = new THREE.Vector3(
      (octant & 1) ? this.bounds.max.x : center.x,
      (octant & 2) ? this.bounds.max.y : center.y,
      (octant & 4) ? this.bounds.max.z : center.z
    );

    return new BHNode({ min, max });
  }
}

/**
 * Barnes-Hut tree for efficient N-body force calculations
 */
export class BarnesHutTree {
  private root: BHNode;
  private theta: number; // Opening angle threshold (typically 0.5)

  constructor(bodies: CelestialBody[], bounds: { min: THREE.Vector3; max: THREE.Vector3 }, theta: number = 0.5) {
    this.theta = theta;
    this.root = new BHNode(bounds);
    this.buildTree(bodies);
  }

  /**
   * Build the Barnes-Hut tree from bodies
   */
  private buildTree(bodies: CelestialBody[]): void {
    for (const body of bodies) {
      this.insert(body, this.root);
    }
    this.updateCenterOfMass(this.root);
  }

  /**
   * Insert a body into the tree
   */
  private insert(body: CelestialBody, node: BHNode): void {
    if (!node.contains(body.position)) {
      return; // Body is outside this node's bounds
    }

    if (node.isEmpty) {
      // Empty node: insert body here
      node.body = body;
      node.isEmpty = false;
      node.centerOfMass.copy(body.position);
      node.totalMass = body.mass;
      return;
    }

    if (node.body !== null) {
      // Node has a body: need to subdivide
      const existingBody = node.body;
      node.body = null;

      // Insert existing body into appropriate child
      const existingOctant = node.getOctant(existingBody.position);
      if (!node.children[existingOctant]) {
        node.children[existingOctant] = node.createChild(existingOctant);
      }
      this.insert(existingBody, node.children[existingOctant]!);

      // Insert new body into appropriate child
      const newOctant = node.getOctant(body.position);
      if (!node.children[newOctant]) {
        node.children[newOctant] = node.createChild(newOctant);
      }
      this.insert(body, node.children[newOctant]!);
    } else {
      // Internal node: insert into appropriate child
      const octant = node.getOctant(body.position);
      if (!node.children[octant]) {
        node.children[octant] = node.createChild(octant);
      }
      this.insert(body, node.children[octant]!);
    }
  }

  /**
   * Update center of mass for a node and its children
   */
  private updateCenterOfMass(node: BHNode): void {
    if (node.isEmpty) {
      return;
    }

    if (node.body !== null) {
      // Leaf node: center of mass is the body's position
      node.centerOfMass.copy(node.body.position);
      node.totalMass = node.body.mass;
    } else {
      // Internal node: calculate from children
      let totalMass = 0;
      const weightedSum = new THREE.Vector3();

      for (const child of node.children) {
        if (child && !child.isEmpty) {
          this.updateCenterOfMass(child);
          totalMass += child.totalMass;
          weightedSum.add(
            child.centerOfMass.clone().multiplyScalar(child.totalMass)
          );
        }
      }

      if (totalMass > 0) {
        node.totalMass = totalMass;
        node.centerOfMass.copy(weightedSum.divideScalar(totalMass));
      }
    }
  }

  /**
   * Calculate gravitational force on a body using Barnes-Hut approximation
   */
  calculateForce(body: CelestialBody, G: number): THREE.Vector3 {
    const force = new THREE.Vector3();
    this.calculateForceRecursive(body, this.root, G, force);
    return force;
  }

  /**
   * Recursive force calculation
   */
  private calculateForceRecursive(
    body: CelestialBody,
    node: BHNode,
    G: number,
    force: THREE.Vector3
  ): void {
    if (node.isEmpty || node === null) {
      return;
    }

    // Skip self
    if (node.body === body) {
      return;
    }

    const direction = new THREE.Vector3().subVectors(
      node.centerOfMass,
      body.position
    );
    const distance = direction.length();

    if (distance < 0.001) {
      return; // Avoid division by zero
    }

    const s = node.getSize();
    const ratio = s / distance;

    // If node is far enough or is a leaf, use it as a point mass
    if (ratio < this.theta || node.body !== null) {
      // Use this node as a point mass
      const distanceSquared = distance * distance;
      const minDistance = 0.1;
      const clampedDistanceSquared = Math.max(distanceSquared, minDistance * minDistance);

      const forceMagnitude = G * body.mass * node.totalMass / clampedDistanceSquared;
      direction.normalize();
      force.add(direction.multiplyScalar(forceMagnitude));
    } else {
      // Node is too close: recurse into children
      for (const child of node.children) {
        if (child && !child.isEmpty) {
          this.calculateForceRecursive(body, child, G, force);
        }
      }
    }
  }

  /**
   * Calculate bounding box for all bodies
   */
  static calculateBounds(bodies: CelestialBody[], padding: number = 10): { min: THREE.Vector3; max: THREE.Vector3 } {
    if (bodies.length === 0) {
      return {
        min: new THREE.Vector3(-100, -100, -100),
        max: new THREE.Vector3(100, 100, 100)
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const body of bodies) {
      minX = Math.min(minX, body.position.x);
      minY = Math.min(minY, body.position.y);
      minZ = Math.min(minZ, body.position.z);
      maxX = Math.max(maxX, body.position.x);
      maxY = Math.max(maxY, body.position.y);
      maxZ = Math.max(maxZ, body.position.z);
    }

    // Add padding
    return {
      min: new THREE.Vector3(minX - padding, minY - padding, minZ - padding),
      max: new THREE.Vector3(maxX + padding, maxY + padding, maxZ + padding)
    };
  }
}

