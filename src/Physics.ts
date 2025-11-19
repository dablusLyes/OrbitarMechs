import * as THREE from 'three';
import type { CelestialBody } from './Body.js';
import { BarnesHutTree } from './BarnesHut.js';

/**
 * Physics engine for N-body gravitational simulation
 * Uses Symplectic Euler integration for better energy conservation
 * Supports Barnes-Hut algorithm for efficient force calculations
 */
export class PhysicsEngine {
  G: number;
  bodies: CelestialBody[];
  useBarnesHut: boolean;
  barnesHutTheta: number; // Opening angle threshold (0.5 is typical)

  constructor(gravitationalConstant = 1.0, useBarnesHut: boolean = true, barnesHutTheta: number = 0.5) {
    this.G = gravitationalConstant;
    this.bodies = [];
    this.useBarnesHut = useBarnesHut;
    this.barnesHutTheta = barnesHutTheta;
  }

  /**
   * Add a body to the simulation
   */
  addBody(body: CelestialBody): void {
    this.bodies.push(body);
  }

  /**
   * Remove a body from the simulation
   */
  removeBody(body: CelestialBody): void {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
  }

  /**
   * Calculate gravitational force between two bodies
   * F = G * (m1 * m2) / r^2
   * Returns force vector acting on body1
   */
  calculateGravityForce(body1: CelestialBody, body2: CelestialBody): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(body2.position, body1.position);
    const distanceSquared = direction.lengthSq();

    // Avoid division by zero and extreme forces at very close distances
    const minDistance = 0.1;
    const clampedDistanceSquared = Math.max(distanceSquared, minDistance * minDistance);

    // If bodies are at the same position, return a small random force to separate them
    if (distanceSquared < 0.001) {
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      const forceMagnitude = this.G * (body1.mass * body2.mass) / clampedDistanceSquared;
      return randomDirection.normalize().multiplyScalar(forceMagnitude);
    }

    const forceMagnitude = this.G * (body1.mass * body2.mass) / clampedDistanceSquared;

    // Normalize direction and scale by force magnitude
    direction.normalize().multiplyScalar(forceMagnitude);

    return direction;
  }

  /**
   * Calculate total gravitational force on a body from all other bodies
   * Uses direct calculation (Barnes-Hut is handled in update() for efficiency)
   */
  calculateTotalForce(body: CelestialBody): THREE.Vector3 {
    // Direct calculation (more accurate for small numbers of bodies)
    const totalForce = new THREE.Vector3(0, 0, 0);

    for (const otherBody of this.bodies) {
      if (otherBody === body) continue;

      const force = this.calculateGravityForce(body, otherBody);
      totalForce.add(force);
    }

    return totalForce;
  }

  /**
   * Update simulation using Symplectic Euler integration
   * This method is better than standard Euler for orbital mechanics
   * as it conserves energy better
   */
  update(deltaTime: number): void {
    // Calculate all forces first
    const forces = new Map<CelestialBody, THREE.Vector3>();

    // Build Barnes-Hut tree once per frame if using it
    let tree: BarnesHutTree | null = null;
    if (this.useBarnesHut && this.bodies.length > 2) {
      const bounds = BarnesHutTree.calculateBounds(this.bodies, 10);
      tree = new BarnesHutTree(this.bodies, bounds, this.barnesHutTheta);
    }

    for (const body of this.bodies) {
      if (tree) {
        // Use pre-built tree
        forces.set(body, tree.calculateForce(body, this.G));
      } else {
        // Use direct calculation
        forces.set(body, this.calculateTotalForce(body));
      }
    }

    // Update velocities based on forces (v = v + a * dt)
    for (const body of this.bodies) {
      if (body.isStatic) continue;

      const force = forces.get(body)!;
      const acceleration = force.clone().divideScalar(body.mass);
      body.velocity.add(acceleration.multiplyScalar(deltaTime));
    }

    // Update positions based on NEW velocities (x = x + v * dt)
    // This is the key difference from standard Euler
    for (const body of this.bodies) {
      if (body.isStatic) continue;

      const displacement = body.velocity.clone().multiplyScalar(deltaTime);
      body.position.add(displacement);
    }
  }

  /**
   * Calculate total energy of the system (for debugging/testing)
   */
  getTotalEnergy(): number {
    let kineticEnergy = 0;
    let potentialEnergy = 0;

    // Kinetic energy: KE = 0.5 * m * v^2
    for (const body of this.bodies) {
      kineticEnergy += 0.5 * body.mass * body.velocity.lengthSq();
    }

    // Potential energy: PE = -G * m1 * m2 / r
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const body1 = this.bodies[i];
        const body2 = this.bodies[j];
        const distance = body1.position.distanceTo(body2.position);
        potentialEnergy -= this.G * body1.mass * body2.mass / Math.max(distance, 0.1);
      }
    }

    return kineticEnergy + potentialEnergy;
  }
}

