import * as THREE from 'three';
import { ALL_PREMADE_BODIES, type PremadeBodyData } from './PremadeData.js';
import { StorageManager, type SavedBody } from './StorageManager.js';
import { ThumbnailGenerator } from './ThumbnailGenerator.js';
import { CelestialBody } from './Body.js';

export type LibraryFilter = 'all' | 'planets' | 'stars';

/**
 * Browser component for premade planets and stars
 */
export class LibraryBrowser {
  private container: HTMLElement;
  private currentFilter: LibraryFilter = 'all';
  private onAddBody: ((body: CelestialBody) => void) | null = null;
  private thumbnailCache: Map<string, string> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Set callback for when a body is added
   */
  setOnAddBody(callback: (body: CelestialBody) => void): void {
    this.onAddBody = callback;
  }

  /**
   * Set filter
   */
  setFilter(filter: LibraryFilter): void {
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
    filterContainer.className = 'library-filter';
    const allBtn = this.createFilterButton('ALL', 'all');
    const planetsBtn = this.createFilterButton('PLANETS', 'planets');
    const starsBtn = this.createFilterButton('STARS', 'stars');
    filterContainer.appendChild(allBtn);
    filterContainer.appendChild(planetsBtn);
    filterContainer.appendChild(starsBtn);
    this.container.appendChild(filterContainer);

    // Get filtered bodies
    const bodies = this.getFilteredBodies();
    const customBodies = this.getCustomBodies();

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'library-grid';

    // Load premade bodies
    bodies.forEach(bodyData => {
      const item = this.createBodyItem(bodyData, false);
      grid.appendChild(item);
    });

    // Load custom bodies
    customBodies.forEach(bodyData => {
      const item = this.createBodyItem(bodyData, true);
      grid.appendChild(item);
    });

    this.container.appendChild(grid);
  }

  /**
   * Create filter button
   */
  private createFilterButton(label: string, filter: LibraryFilter): HTMLElement {
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
   * Get filtered bodies
   */
  private getFilteredBodies(): PremadeBodyData[] {
    if (this.currentFilter === 'all') {
      return ALL_PREMADE_BODIES;
    } else if (this.currentFilter === 'planets') {
      return ALL_PREMADE_BODIES.filter(b => b.type === 'planet');
    } else {
      return ALL_PREMADE_BODIES.filter(b => b.type === 'star');
    }
  }

  /**
   * Get custom bodies from storage
   */
  private getCustomBodies(): SavedBody[] {
    const customBodies = StorageManager.loadCustomBodies();
    if (this.currentFilter === 'all') {
      return customBodies;
    } else if (this.currentFilter === 'planets') {
      return customBodies.filter(b => b.type === 'planet');
    } else {
      return customBodies.filter(b => b.type === 'star');
    }
  }

  /**
   * Create body item card
   */
  private createBodyItem(bodyData: PremadeBodyData | SavedBody, isCustom: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = 'library-item';
    if (isCustom) {
      item.classList.add('custom');
    }

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'library-item-thumbnail';
    thumbnail.innerHTML = '<div class="thumbnail-loading">LOADING...</div>';
    item.appendChild(thumbnail);

    // Load thumbnail asynchronously
    this.loadThumbnail(bodyData, thumbnail);

    // Info
    const info = document.createElement('div');
    info.className = 'library-item-info';
    const name = document.createElement('div');
    name.className = 'library-item-name';
    name.textContent = bodyData.name;
    info.appendChild(name);

    if ('description' in bodyData && bodyData.description) {
      const desc = document.createElement('div');
      desc.className = 'library-item-desc';
      desc.textContent = bodyData.description;
      info.appendChild(desc);
    }

    const props = document.createElement('div');
    props.className = 'library-item-props';
    props.innerHTML = `
      <span>M: ${bodyData.mass.toFixed(2)}</span>
      <span>R: ${bodyData.radius.toFixed(2)}</span>
    `;
    info.appendChild(props);

    item.appendChild(info);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'library-item-add';
    addBtn.textContent = 'ADD';
    addBtn.onclick = () => {
      this.addBodyToScene(bodyData, isCustom);
    };
    item.appendChild(addBtn);

    return item;
  }

  /**
   * Load thumbnail for body
   */
  private async loadThumbnail(
    bodyData: PremadeBodyData | SavedBody,
    container: HTMLElement
  ): Promise<void> {
    const cacheKey = `${bodyData.name}_${bodyData.color}_${bodyData.radius}`;

    // Check cache
    if (this.thumbnailCache.has(cacheKey)) {
      const dataUrl = this.thumbnailCache.get(cacheKey)!;
      container.innerHTML = `<img src="${dataUrl}" alt="${bodyData.name}" />`;
      return;
    }

    try {
      const dataUrl = await ThumbnailGenerator.generatePremadeBodyThumbnail({
        name: bodyData.name,
        type: bodyData.type,
        mass: bodyData.mass,
        radius: bodyData.radius,
        color: bodyData.color,
        emissive: bodyData.emissive,
        emissiveIntensity: bodyData.emissiveIntensity
      });

      this.thumbnailCache.set(cacheKey, dataUrl);
      container.innerHTML = `<img src="${dataUrl}" alt="${bodyData.name}" />`;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      container.innerHTML = '<div class="thumbnail-error">ERROR</div>';
    }
  }

  /**
   * Add body to scene
   */
  private addBodyToScene(bodyData: PremadeBodyData | SavedBody, isCustom: boolean): void {
    if (!this.onAddBody) return;

    // Create body at a random position around origin
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    const position = new THREE.Vector3(
      Math.cos(angle) * distance,
      (Math.random() - 0.5) * 20,
      Math.sin(angle) * distance
    );

    // Calculate orbital velocity (simplified)
    const centralMass = 100; // Assume central mass
    const G = 1.0;
    const velocityMag = Math.sqrt(G * centralMass / distance);
    const velocity = new THREE.Vector3(
      -Math.sin(angle) * velocityMag,
      0,
      Math.cos(angle) * velocityMag
    );

    const body = new CelestialBody({
      name: bodyData.name,
      mass: bodyData.mass,
      radius: bodyData.radius,
      position: position,
      velocity: velocity,
      color: bodyData.color,
      emissive: bodyData.emissive,
      emissiveIntensity: bodyData.emissiveIntensity,
      isStatic: bodyData.type === 'star' && bodyData.mass >= 10
    });

    // Load textures if available (for custom bodies)
    if (isCustom && 'textureUrl' in bodyData && bodyData.textureUrl) {
      body.loadTexture(bodyData.textureUrl).catch(err => {
        console.error('Failed to load texture:', err);
      });
    }
    if (isCustom && 'normalMapUrl' in bodyData && bodyData.normalMapUrl) {
      body.loadNormalMap(bodyData.normalMapUrl).catch(err => {
        console.error('Failed to load normal map:', err);
      });
    }

    this.onAddBody(body);
  }

  /**
   * Refresh the browser (reload custom bodies)
   */
  refresh(): void {
    this.render();
  }
}

