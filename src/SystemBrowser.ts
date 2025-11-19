import * as THREE from 'three';
import { ALL_PREMADE_SYSTEMS, type PremadeSystemData } from './PremadeData.js';
import { StorageManager, type SavedSystem } from './StorageManager.js';
import { ThumbnailGenerator } from './ThumbnailGenerator.js';
import { CelestialBody } from './Body.js';

export type SystemFilter = 'all' | 'premade' | 'custom';

/**
 * Browser component for premade and custom systems
 */
export class SystemBrowser {
  private container: HTMLElement;
  private currentFilter: SystemFilter = 'all';
  private onLoadSystem: ((bodies: CelestialBody[]) => void) | null = null;
  private onSaveSystem: (() => void) | null = null;
  private thumbnailCache: Map<string, string> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Set callback for when a system is loaded
   */
  setOnLoadSystem(callback: (bodies: CelestialBody[]) => void): void {
    this.onLoadSystem = callback;
  }

  /**
   * Set callback for saving current system
   */
  setOnSaveSystem(callback: () => void): void {
    this.onSaveSystem = callback;
  }

  /**
   * Set filter
   */
  setFilter(filter: SystemFilter): void {
    this.currentFilter = filter;
    this.render();
  }

  /**
   * Render the browser
   */
  private render(): void {
    this.container.innerHTML = '';

    // Filter controls
    const filterContainer = document.createElement('div');
    filterContainer.className = 'system-filter';
    const allBtn = this.createFilterButton('ALL', 'all');
    const premadeBtn = this.createFilterButton('PREMADE', 'premade');
    const customBtn = this.createFilterButton('CUSTOM', 'custom');
    filterContainer.appendChild(allBtn);
    filterContainer.appendChild(premadeBtn);
    filterContainer.appendChild(customBtn);
    this.container.appendChild(filterContainer);

    // Save current button
    if (this.onSaveSystem) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-current-btn';
      saveBtn.textContent = 'SAVE CURRENT SYSTEM';
      saveBtn.onclick = () => {
        if (this.onSaveSystem) {
          this.onSaveSystem();
        }
      };
      this.container.appendChild(saveBtn);
    }

    // Get filtered systems
    const systems = this.getFilteredSystems();

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'system-grid';

    // Load systems
    systems.forEach(system => {
      const item = this.createSystemItem(system);
      grid.appendChild(item);
    });

    this.container.appendChild(grid);
  }

  /**
   * Create filter button
   */
  private createFilterButton(label: string, filter: SystemFilter): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    if (this.currentFilter === filter) {
      btn.classList.add('active');
    }
    btn.textContent = label;
    btn.onclick = () => {
      this.setFilter(filter);
    };
    return btn;
  }

  /**
   * Get filtered systems
   */
  private getFilteredSystems(): Array<PremadeSystemData | SavedSystem> {
    const premade = ALL_PREMADE_SYSTEMS.map(s => ({ ...s, isPremade: true })) as SavedSystem[];
    const custom = StorageManager.loadCustomSystems();

    if (this.currentFilter === 'all') {
      return [...premade, ...custom];
    } else if (this.currentFilter === 'premade') {
      return premade;
    } else {
      return custom;
    }
  }

  /**
   * Create system item card
   */
  private createSystemItem(system: PremadeSystemData | SavedSystem): HTMLElement {
    const item = document.createElement('div');
    item.className = 'system-item';
    const isPremade = 'isPremade' in system ? system.isPremade : true;
    if (!isPremade) {
      item.classList.add('custom');
    }

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'system-item-thumbnail';
    const systemThumbnail = 'thumbnail' in system ? system.thumbnail : undefined;
    if (systemThumbnail) {
      thumbnail.innerHTML = `<img src="${systemThumbnail}" alt="${system.name}" />`;
    } else {
      thumbnail.innerHTML = '<div class="thumbnail-loading">LOADING...</div>';
      this.loadThumbnail(system, thumbnail);
    }
    item.appendChild(thumbnail);

    // Info
    const info = document.createElement('div');
    info.className = 'system-item-info';
    const name = document.createElement('div');
    name.className = 'system-item-name';
    name.textContent = system.name;
    info.appendChild(name);

    if (system.description) {
      const desc = document.createElement('div');
      desc.className = 'system-item-desc';
      desc.textContent = system.description;
      info.appendChild(desc);
    }

    const props = document.createElement('div');
    props.className = 'system-item-props';
    props.innerHTML = `<span>${system.bodies.length} BODIES</span>`;
    info.appendChild(props);

    item.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'system-item-actions';

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'system-item-load';
    loadBtn.textContent = 'LOAD';
    loadBtn.onclick = () => {
      this.loadSystem(system);
    };
    actions.appendChild(loadBtn);

    // Export button (for custom systems)
    if (!isPremade) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'system-item-export';
      exportBtn.textContent = 'EXPORT';
      exportBtn.onclick = () => {
        StorageManager.exportSystemToJSON(system as SavedSystem);
      };
      actions.appendChild(exportBtn);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'system-item-delete';
      deleteBtn.textContent = 'DELETE';
      deleteBtn.onclick = () => {
        if (confirm(`Delete system "${system.name}"?`)) {
          StorageManager.deleteCustomSystem((system as SavedSystem).id);
          this.render();
        }
      };
      actions.appendChild(deleteBtn);
    }

    item.appendChild(actions);

    return item;
  }

  /**
   * Load thumbnail for system
   */
  private async loadThumbnail(
    system: PremadeSystemData | SavedSystem,
    container: HTMLElement
  ): Promise<void> {
    const cacheKey = `system_${system.name}_${system.bodies.length}`;

    // Check cache
    if (this.thumbnailCache.has(cacheKey)) {
      const dataUrl = this.thumbnailCache.get(cacheKey)!;
      container.innerHTML = `<img src="${dataUrl}" alt="${system.name}" />`;
      return;
    }

    try {
      // Create temporary bodies for thumbnail generation
      const tempBodies: CelestialBody[] = [];
      for (const bodyData of system.bodies) {
        const body = new CelestialBody({
          name: bodyData.name,
          mass: bodyData.mass,
          radius: bodyData.radius,
          position: new THREE.Vector3(
            bodyData.position.x,
            bodyData.position.y,
            bodyData.position.z
          ),
          velocity: new THREE.Vector3(0, 0, 0),
          color: bodyData.color,
          emissive: bodyData.emissive,
          emissiveIntensity: bodyData.emissiveIntensity,
          isStatic: bodyData.isStatic
        });
        tempBodies.push(body);
      }

      const dataUrl = await ThumbnailGenerator.generateSystemThumbnail(tempBodies);

      // Cleanup
      tempBodies.forEach(body => body.dispose());

      this.thumbnailCache.set(cacheKey, dataUrl);
      container.innerHTML = `<img src="${dataUrl}" alt="${system.name}" />`;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      container.innerHTML = '<div class="thumbnail-error">ERROR</div>';
    }
  }

  /**
   * Load system into scene
   */
  private loadSystem(system: PremadeSystemData | SavedSystem): void {
    if (!this.onLoadSystem) return;

    const bodies: CelestialBody[] = [];

    for (const bodyData of system.bodies) {
      const body = new CelestialBody({
        name: bodyData.name,
        mass: bodyData.mass,
        radius: bodyData.radius,
        position: new THREE.Vector3(
          bodyData.position.x,
          bodyData.position.y,
          bodyData.position.z
        ),
        velocity: new THREE.Vector3(
          bodyData.velocity.x,
          bodyData.velocity.y,
          bodyData.velocity.z
        ),
        color: bodyData.color,
        emissive: bodyData.emissive,
        emissiveIntensity: bodyData.emissiveIntensity,
        isStatic: bodyData.isStatic,
        textureUrl: 'textureUrl' in bodyData ? bodyData.textureUrl : undefined,
        normalMapUrl: 'normalMapUrl' in bodyData ? bodyData.normalMapUrl : undefined
      });

      // Load textures if available
      if ('textureUrl' in bodyData && bodyData.textureUrl) {
        body.loadTexture(bodyData.textureUrl).catch(err => {
          console.error('Failed to load texture:', err);
        });
      }
      if ('normalMapUrl' in bodyData && bodyData.normalMapUrl) {
        body.loadNormalMap(bodyData.normalMapUrl).catch(err => {
          console.error('Failed to load normal map:', err);
        });
      }

      bodies.push(body);
    }

    this.onLoadSystem(bodies);
  }

  /**
   * Refresh the browser (reload custom systems)
   */
  refresh(): void {
    this.render();
  }
}

