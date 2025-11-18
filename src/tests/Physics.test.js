import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PhysicsEngine } from '../Physics.js';
import { CelestialBody } from '../Body.js';

describe('PhysicsEngine', () => {
  let physics;

  beforeEach(() => {
    physics = new PhysicsEngine(1.0);
  });

  describe('Gravity Force Calculation', () => {
    it('should calculate correct gravitational force between two bodies', () => {
      const body1 = new CelestialBody({
        mass: 10,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      const body2 = new CelestialBody({
        mass: 5,
        position: new THREE.Vector3(10, 0, 0),
        radius: 1
      });

      const force = physics.calculateGravityForce(body1, body2);

      // F = G * m1 * m2 / r^2
      // F = 1.0 * 10 * 5 / (10^2) = 0.5
      const expectedMagnitude = 0.5;
      const actualMagnitude = force.length();

      expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 5);

      // Force should point from body1 to body2 (positive X direction)
      expect(force.x).toBeGreaterThan(0);
      expect(force.y).toBeCloseTo(0, 5);
      expect(force.z).toBeCloseTo(0, 5);
    });

    it('should handle bodies at the same position (minimum distance clamping)', () => {
      const body1 = new CelestialBody({
        mass: 10,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      const body2 = new CelestialBody({
        mass: 5,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      const force = physics.calculateGravityForce(body1, body2);

      // Should not be infinite or NaN
      expect(Number.isFinite(force.length())).toBe(true);
      expect(force.length()).toBeGreaterThan(0);
    });

    it('should calculate force in 3D space correctly', () => {
      const body1 = new CelestialBody({
        mass: 100,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      const body2 = new CelestialBody({
        mass: 1,
        position: new THREE.Vector3(3, 4, 0),
        radius: 1
      });

      const force = physics.calculateGravityForce(body1, body2);

      // Distance = sqrt(3^2 + 4^2) = 5
      // F = G * m1 * m2 / r^2 = 1.0 * 100 * 1 / 25 = 4
      const expectedMagnitude = 4.0;
      const actualMagnitude = force.length();

      expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 5);
    });
  });

  describe('Total Force Calculation', () => {
    it('should sum forces from multiple bodies', () => {
      const centralBody = new CelestialBody({
        mass: 100,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      const body1 = new CelestialBody({
        mass: 1,
        position: new THREE.Vector3(10, 0, 0),
        radius: 1
      });

      const body2 = new CelestialBody({
        mass: 1,
        position: new THREE.Vector3(-10, 0, 0),
        radius: 1
      });

      physics.addBody(centralBody);
      physics.addBody(body1);
      physics.addBody(body2);

      const totalForce = physics.calculateTotalForce(centralBody);

      // Forces from body1 and body2 should cancel out (symmetry)
      expect(totalForce.x).toBeCloseTo(0, 5);
      expect(totalForce.y).toBeCloseTo(0, 5);
      expect(totalForce.z).toBeCloseTo(0, 5);
    });
  });

  describe('Symplectic Euler Integration', () => {
    it('should update velocities and positions correctly', () => {
      const body = new CelestialBody({
        mass: 1,
        position: new THREE.Vector3(10, 0, 0),
        velocity: new THREE.Vector3(0, 0, 1),
        radius: 1
      });

      const star = new CelestialBody({
        mass: 100,
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        isStatic: true,
        radius: 2
      });

      physics.addBody(star);
      physics.addBody(body);

      const initialPosition = body.position.clone();
      const initialVelocity = body.velocity.clone();

      physics.update(0.1);

      // Position should have changed
      expect(body.position.equals(initialPosition)).toBe(false);

      // Velocity should have changed (due to gravity)
      expect(body.velocity.equals(initialVelocity)).toBe(false);

      // Static body should not move
      expect(star.position.x).toBe(0);
      expect(star.position.y).toBe(0);
      expect(star.position.z).toBe(0);
    });

    it('should conserve energy reasonably well over time (circular orbit)', () => {
      // Set up a circular orbit
      const G = 1.0;
      const starMass = 1000;
      const planetMass = 1;
      const orbitRadius = 20;

      // For circular orbit: v = sqrt(G * M / r)
      const orbitalVelocity = Math.sqrt(G * starMass / orbitRadius);

      const star = new CelestialBody({
        mass: starMass,
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        isStatic: true,
        radius: 3
      });

      const planet = new CelestialBody({
        mass: planetMass,
        position: new THREE.Vector3(orbitRadius, 0, 0),
        velocity: new THREE.Vector3(0, 0, orbitalVelocity),
        radius: 1
      });

      physics.addBody(star);
      physics.addBody(planet);

      const initialEnergy = physics.getTotalEnergy();
      const initialDistance = planet.position.distanceTo(star.position);

      // Run simulation for multiple orbits
      const timeStep = 0.01;
      const steps = 1000;

      for (let i = 0; i < steps; i++) {
        physics.update(timeStep);
      }

      const finalEnergy = physics.getTotalEnergy();
      const finalDistance = planet.position.distanceTo(star.position);

      // Energy should be conserved within 5% (Symplectic Euler is not perfect but good)
      const energyChange = Math.abs((finalEnergy - initialEnergy) / initialEnergy);
      expect(energyChange).toBeLessThan(0.05);

      // Orbit radius should remain relatively stable (within 10%)
      const distanceChange = Math.abs((finalDistance - initialDistance) / initialDistance);
      expect(distanceChange).toBeLessThan(0.1);
    });
  });

  describe('Energy Calculation', () => {
    it('should calculate total energy correctly', () => {
      const body1 = new CelestialBody({
        mass: 10,
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(1, 0, 0),
        radius: 1
      });

      const body2 = new CelestialBody({
        mass: 5,
        position: new THREE.Vector3(10, 0, 0),
        velocity: new THREE.Vector3(0, 1, 0),
        radius: 1
      });

      physics.addBody(body1);
      physics.addBody(body2);

      const energy = physics.getTotalEnergy();

      // KE = 0.5 * m * v^2
      const ke1 = 0.5 * 10 * 1; // 5
      const ke2 = 0.5 * 5 * 1;  // 2.5
      const totalKE = ke1 + ke2; // 7.5

      // PE = -G * m1 * m2 / r
      const totalPE = -1.0 * 10 * 5 / 10; // -5

      const expectedEnergy = totalKE + totalPE; // 2.5

      expect(energy).toBeCloseTo(expectedEnergy, 5);
    });

    it('should have negative total energy for bound systems', () => {
      // A bound orbit should have negative total energy
      const star = new CelestialBody({
        mass: 1000,
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        radius: 2
      });

      const planet = new CelestialBody({
        mass: 1,
        position: new THREE.Vector3(20, 0, 0),
        velocity: new THREE.Vector3(0, 0, 7), // Orbital velocity
        radius: 1
      });

      physics.addBody(star);
      physics.addBody(planet);

      const energy = physics.getTotalEnergy();

      expect(energy).toBeLessThan(0);
    });
  });

  describe('Body Management', () => {
    it('should add and remove bodies correctly', () => {
      const body = new CelestialBody({
        mass: 10,
        position: new THREE.Vector3(0, 0, 0),
        radius: 1
      });

      expect(physics.bodies.length).toBe(0);

      physics.addBody(body);
      expect(physics.bodies.length).toBe(1);
      expect(physics.bodies[0]).toBe(body);

      physics.removeBody(body);
      expect(physics.bodies.length).toBe(0);
    });
  });
});
