import type { CelestialBody } from './Body.js';

/**
 * Saved body data structure
 */
export interface SavedBody {
  name: string;
  type: 'planet' | 'star';
  mass: number;
  radius: number;
  color: number;
  emissive: number;
  emissiveIntensity: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  isStatic: boolean;
  textureUrl?: string;
  normalMapUrl?: string;
}

/**
 * Saved system data structure
 */
export interface SavedSystem {
  id: string;
  name: string;
  bodies: SavedBody[];
  thumbnail?: string; // base64 or data URL
  createdAt: number;
  isPremade: boolean;
  description?: string;
}

/**
 * Storage keys
 */
const STORAGE_KEY_CUSTOM_SYSTEMS = 'antigravity_custom_systems';
const STORAGE_KEY_CUSTOM_BODIES = 'antigravity_custom_bodies';

/**
 * Storage manager for saving/loading systems and custom bodies
 */
export class StorageManager {
  /**
   * Save a custom system to localStorage
   */
  static saveCustomSystem(system: SavedSystem): void {
    const systems = this.loadCustomSystems();
    const existingIndex = systems.findIndex(s => s.id === system.id);

    if (existingIndex >= 0) {
      systems[existingIndex] = system;
    } else {
      systems.push(system);
    }

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SYSTEMS, JSON.stringify(systems));
    } catch (error) {
      console.error('Failed to save system to localStorage:', error);
      throw new Error('Failed to save system. LocalStorage may be full.');
    }
  }

  /**
   * Load all custom systems from localStorage
   */
  static loadCustomSystems(): SavedSystem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOM_SYSTEMS);
      if (!data) return [];
      return JSON.parse(data) as SavedSystem[];
    } catch (error) {
      console.error('Failed to load systems from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete a custom system
   */
  static deleteCustomSystem(systemId: string): void {
    const systems = this.loadCustomSystems();
    const filtered = systems.filter(s => s.id !== systemId);

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SYSTEMS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete system from localStorage:', error);
    }
  }

  /**
   * Save a custom body to localStorage
   */
  static saveCustomBody(body: SavedBody): void {
    const bodies = this.loadCustomBodies();
    const existingIndex = bodies.findIndex(b => b.name === body.name);

    if (existingIndex >= 0) {
      bodies[existingIndex] = body;
    } else {
      bodies.push(body);
    }

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_BODIES, JSON.stringify(bodies));
    } catch (error) {
      console.error('Failed to save body to localStorage:', error);
      throw new Error('Failed to save body. LocalStorage may be full.');
    }
  }

  /**
   * Load all custom bodies from localStorage
   */
  static loadCustomBodies(): SavedBody[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOM_BODIES);
      if (!data) return [];
      return JSON.parse(data) as SavedBody[];
    } catch (error) {
      console.error('Failed to load bodies from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete a custom body
   */
  static deleteCustomBody(bodyName: string): void {
    const bodies = this.loadCustomBodies();
    const filtered = bodies.filter(b => b.name !== bodyName);

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_BODIES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete body from localStorage:', error);
    }
  }

  /**
   * Convert CelestialBody array to SavedSystem
   */
  static bodiesToSystem(
    bodies: CelestialBody[],
    name: string,
    description?: string,
    thumbnail?: string
  ): SavedSystem {
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      bodies: bodies.map(body => body.toJSON()),
      thumbnail,
      createdAt: Date.now(),
      isPremade: false
    };
  }

  /**
   * Export system to JSON file
   */
  static exportSystemToJSON(system: SavedSystem): void {
    const json = JSON.stringify(system, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${system.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import system from JSON file
   */
  static async importSystemFromJSON(file: File): Promise<SavedSystem> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const system = JSON.parse(json) as SavedSystem;

          // Validate system structure
          if (!system.name || !Array.isArray(system.bodies)) {
            throw new Error('Invalid system file format');
          }

          // Generate new ID and timestamp
          system.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          system.createdAt = Date.now();
          system.isPremade = false;

          resolve(system);
        } catch (error) {
          reject(new Error(`Failed to parse system file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Export all custom systems to JSON file
   */
  static exportAllSystemsToJSON(): void {
    const systems = this.loadCustomSystems();
    const json = JSON.stringify(systems, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'antigravity_systems_backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import systems from JSON file (backup restore)
   */
  static async importSystemsFromJSON(file: File): Promise<SavedSystem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const systems = JSON.parse(json) as SavedSystem[];

          // Validate systems array
          if (!Array.isArray(systems)) {
            throw new Error('Invalid systems file format');
          }

          // Validate each system
          for (const system of systems) {
            if (!system.name || !Array.isArray(system.bodies)) {
              throw new Error('Invalid system in file');
            }
            // Generate new IDs and timestamps
            system.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            system.createdAt = Date.now();
            system.isPremade = false;
          }

          resolve(systems);
        } catch (error) {
          reject(new Error(`Failed to parse systems file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Clear all custom data
   */
  static clearAllCustomData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_SYSTEMS);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_BODIES);
    } catch (error) {
      console.error('Failed to clear custom data:', error);
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): { systems: number; bodies: number; size: number } {
    const systems = this.loadCustomSystems();
    const bodies = this.loadCustomBodies();

    let size = 0;
    try {
      size += (localStorage.getItem(STORAGE_KEY_CUSTOM_SYSTEMS) || '').length;
      size += (localStorage.getItem(STORAGE_KEY_CUSTOM_BODIES) || '').length;
    } catch (error) {
      // Ignore
    }

    return {
      systems: systems.length,
      bodies: bodies.length,
      size
    };
  }
}

