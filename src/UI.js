import { Pane } from 'tweakpane';
import * as THREE from 'three';


/**
 * Manages the UI panel for editing celestial body properties
 */
export class UIManager {
  constructor() {
    this.pane = new Pane({
      title: 'Planet Simulation',
      expanded: true
    });

    this.selectedBody = null;
    this.bodyFolder = null;
    this.globalFolder = null;

    // Global settings
    this.settings = {
      timeScale: 1.0,
      gravitationalConstant: 1.0,
      showTrails: true,
      paused: false
    };

    this.setupGlobalControls();
  }

  /**
   * Setup global simulation controls
   */
  setupGlobalControls() {
    this.globalFolder = this.pane.addFolder({
      title: 'Global Settings',
      expanded: true
    });

    this.globalFolder.addBinding(this.settings, 'timeScale', {
      label: 'Time Scale',
      min: 0.1,
      max: 5.0,
      step: 0.1
    });

    this.globalFolder.addBinding(this.settings, 'gravitationalConstant', {
      label: 'Gravity (G)',
      min: 0.1,
      max: 10.0,
      step: 0.1
    });

    this.globalFolder.addBinding(this.settings, 'showTrails', {
      label: 'Show Trails'
    });

    this.globalFolder.addBinding(this.settings, 'paused', {
      label: 'Paused'
    });

    this.globalFolder.addButton({
      title: 'Reset Trails'
    });
  }

  /**
   * Update UI to show selected body properties
   */
  selectBody(body) {
    // Remove previous body folder if exists
    if (this.bodyFolder) {
      this.bodyFolder.dispose();
      this.bodyFolder = null;
    }

    this.selectedBody = body;

    if (!body) return;

    // Create new folder for selected body
    this.bodyFolder = this.pane.addFolder({
      title: `Selected: ${body.name}`,
      expanded: true
    });

    // Name
    this.bodyFolder.addBinding(body, 'name', {
      label: 'Name'
    });

    // Mass
    this.bodyFolder.addBinding(body, 'mass', {
      label: 'Mass',
      min: 0.1,
      max: 1000,
      step: 0.1
    });

    // Radius
    this.bodyFolder.addBinding(body, 'radius', {
      label: 'Radius',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', () => {
      // Update mesh geometry when radius changes
      body.geometry.dispose();
      body.geometry = new THREE.SphereGeometry(body.radius, 32, 32);
      body.mesh.geometry = body.geometry;
    });

    // Color
    this.bodyFolder.addBinding(body, 'color', {
      label: 'Color',
      view: 'color'
    }).on('change', () => {
      body.updateVisuals();
    });

    // Emissive color
    this.bodyFolder.addBinding(body, 'emissive', {
      label: 'Emission Color',
      view: 'color'
    }).on('change', () => {
      body.updateVisuals();
    });

    // Emissive intensity
    this.bodyFolder.addBinding(body, 'emissiveIntensity', {
      label: 'Emission Intensity',
      min: 0,
      max: 2,
      step: 0.01
    }).on('change', () => {
      body.updateVisuals();
    });

    // Position
    const posFolder = this.bodyFolder.addFolder({
      title: 'Position',
      expanded: false
    });
    posFolder.addBinding(body.position, 'x', { min: -100, max: 100 });
    posFolder.addBinding(body.position, 'y', { min: -100, max: 100 });
    posFolder.addBinding(body.position, 'z', { min: -100, max: 100 });

    // Velocity
    const velFolder = this.bodyFolder.addFolder({
      title: 'Velocity',
      expanded: false
    });
    velFolder.addBinding(body.velocity, 'x', { min: -10, max: 10, step: 0.1 });
    velFolder.addBinding(body.velocity, 'y', { min: -10, max: 10, step: 0.1 });
    velFolder.addBinding(body.velocity, 'z', { min: -10, max: 10, step: 0.1 });

    // Static toggle
    this.bodyFolder.addBinding(body, 'isStatic', {
      label: 'Static (Fixed)'
    });

    // Clear trail button
    this.bodyFolder.addButton({
      title: 'Clear Trail'
    }).on('click', () => {
      body.clearTrail();
    });
  }

  /**
   * Get current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Clean up
   */
  dispose() {
    this.pane.dispose();
  }
}
