import { LibraryBrowser } from './LibraryBrowser.js';
import { SystemBrowser } from './SystemBrowser.js';
import { CreatePlanetModal } from './CreatePlanetModal.js';
import { StorageManager } from './StorageManager.js';
import { ThumbnailGenerator } from './ThumbnailGenerator.js';
import { CelestialBody } from './Body.js';

export type SystemBuilderTab = 'library' | 'systems' | 'create';

/**
 * Main system builder menu component
 */
export class SystemBuilder {
  private container: HTMLElement;
  private currentTab: SystemBuilderTab = 'library';
  private libraryBrowser: LibraryBrowser | null = null;
  private systemBrowser: SystemBrowser | null = null;
  private createPlanetModal: CreatePlanetModal;
  private isExpanded: boolean = true;

  // Callbacks
  private onAddBody: ((body: CelestialBody) => void) | null = null;
  private onLoadSystem: ((bodies: CelestialBody[]) => void) | null = null;
  private onGetCurrentBodies: (() => CelestialBody[]) | null = null;

  constructor() {
    this.container = this.createContainer();
    this.createPlanetModal = new CreatePlanetModal();
    document.body.appendChild(this.container);
    this.render();
  }

  /**
   * Set callback for adding a body
   */
  setOnAddBody(callback: (body: CelestialBody) => void): void {
    this.onAddBody = callback;
  }

  /**
   * Set callback for loading a system
   */
  setOnLoadSystem(callback: (bodies: CelestialBody[]) => void): void {
    this.onLoadSystem = callback;
  }

  /**
   * Set callback for getting current bodies
   */
  setOnGetCurrentBodies(callback: () => CelestialBody[]): void {
    this.onGetCurrentBodies = callback;
  }

  /**
   * Create main container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'system-builder';
    return container;
  }

  /**
   * Render the builder
   */
  private render(): void {
    this.container.innerHTML = '';

    // Header with toggle
    const header = document.createElement('div');
    header.className = 'system-builder-header';
    const title = document.createElement('div');
    title.className = 'system-builder-title';
    title.textContent = 'SYSTEM BUILDER';
    header.appendChild(title);
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'system-builder-toggle';
    toggleBtn.textContent = this.isExpanded ? '−' : '+';
    toggleBtn.onclick = () => {
      this.isExpanded = !this.isExpanded;
      this.render();
    };
    header.appendChild(toggleBtn);
    this.container.appendChild(header);

    if (!this.isExpanded) {
      return;
    }

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'system-builder-tabs';
    const libraryTab = this.createTab('LIBRARY', 'library');
    const systemsTab = this.createTab('SYSTEMS', 'systems');
    const createTab = this.createTab('CREATE', 'create');
    tabs.appendChild(libraryTab);
    tabs.appendChild(systemsTab);
    tabs.appendChild(createTab);
    this.container.appendChild(tabs);

    // Content
    const content = document.createElement('div');
    content.className = 'system-builder-content';

    if (this.currentTab === 'library') {
      const libraryContainer = document.createElement('div');
      libraryContainer.className = 'system-builder-tab-content';
      this.libraryBrowser = new LibraryBrowser(libraryContainer);
      if (this.onAddBody) {
        this.libraryBrowser.setOnAddBody(this.onAddBody);
      }
      content.appendChild(libraryContainer);
    } else if (this.currentTab === 'systems') {
      const systemsContainer = document.createElement('div');
      systemsContainer.className = 'system-builder-tab-content';
      this.systemBrowser = new SystemBrowser(systemsContainer);
      if (this.onLoadSystem) {
        this.systemBrowser.setOnLoadSystem(this.onLoadSystem);
      }
      this.systemBrowser.setOnSaveSystem(() => {
        this.saveCurrentSystem();
      });
      content.appendChild(systemsContainer);
    } else if (this.currentTab === 'create') {
      const createContainer = document.createElement('div');
      createContainer.className = 'system-builder-tab-content';
      const createBtn = document.createElement('button');
      createBtn.className = 'create-planet-btn';
      createBtn.textContent = 'CREATE PLANET/STAR';
      createBtn.onclick = () => {
        this.showCreateModal();
      };
      createContainer.appendChild(createBtn);
      content.appendChild(createContainer);
    }

    this.container.appendChild(content);
  }

  /**
   * Create tab button
   */
  private createTab(label: string, tab: SystemBuilderTab): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'system-builder-tab';
    if (this.currentTab === tab) {
      btn.classList.add('active');
    }
    btn.textContent = label;
    btn.onclick = () => {
      this.currentTab = tab;
      this.render();
    };
    return btn;
  }

  /**
   * Show create planet modal
   */
  private async showCreateModal(): Promise<void> {
    const result = await this.createPlanetModal.show();
    if (result && this.onAddBody) {
      this.onAddBody(result.body);
    }
  }

  /**
   * Save current system
   */
  private async saveCurrentSystem(): Promise<void> {
    if (!this.onGetCurrentBodies) return;

    const bodies = this.onGetCurrentBodies();
    if (bodies.length === 0) {
      alert('No bodies in current system to save');
      return;
    }

    const name = prompt('Enter system name:');
    if (!name || name.trim() === '') {
      return;
    }

    const description = prompt('Enter system description (optional):') || undefined;

    // Generate thumbnail
    let thumbnail: string | undefined;
    try {
      thumbnail = await ThumbnailGenerator.generateSystemThumbnail(bodies);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    // Create system
    const system = StorageManager.bodiesToSystem(bodies, name.trim(), description, thumbnail);

    // Save to storage
    try {
      StorageManager.saveCustomSystem(system);
      alert(`System "${name}" saved successfully!`);
      if (this.systemBrowser) {
        this.systemBrowser.refresh();
      }
    } catch (error) {
      alert(`Failed to save system: ${error}`);
    }
  }

  /**
   * Refresh browsers
   */
  refresh(): void {
    if (this.libraryBrowser) {
      this.libraryBrowser.refresh();
    }
    if (this.systemBrowser) {
      this.systemBrowser.refresh();
    }
  }

  /**
   * Dispose of builder
   */
  dispose(): void {
    if (this.createPlanetModal) {
      this.createPlanetModal.dispose();
    }
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

