import * as THREE from 'three';

/**
 * Physics engine for N-body gravitational simulation
 * Uses Symplectic Euler integration for better energy conservation
 */
export class PhysicsEngine {
  constructor(gravitationalConstant = 1.0) {
    this.G = gravitationalConstant;
    this.bodies = [];
  }

  /**
   * Add a body to the simulation
   */
  addBody(body) {
    this.bodies.push(body);
  }

  /**
   * Remove a body from the simulation
   */
  removeBody(body) {
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
  calculateGravityForce(body1, body2) {
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
   */
  calculateTotalForce(body) {
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
  update(deltaTime) {
    // Calculate all forces first
    const forces = new Map();
    for (const body of this.bodies) {
      forces.set(body, this.calculateTotalForce(body));
    }

    // Update velocities based on forces (v = v + a * dt)
    for (const body of this.bodies) {
      if (body.isStatic) continue;

      const force = forces.get(body);
      const acceleration = force.divideScalar(body.mass);
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
  getTotalEnergy() {
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
