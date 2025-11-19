import { InteractionMode, ModeManager } from './ModeManager.js';

/**
 * Toolbar button configuration
 */
interface ToolbarButton {
  mode: InteractionMode;
  icon: string;
  label: string;
  shortcut: string;
}

/**
 * Toolbar component for mode switching
 */
export class Toolbar {
  private container: HTMLElement;
  private modeManager: ModeManager;
  private buttons: Map<InteractionMode, HTMLElement>;
  private buttonConfigs: ToolbarButton[];

  constructor(modeManager: ModeManager) {
    this.modeManager = modeManager;
    this.buttons = new Map();

    // Define button configurations
    this.buttonConfigs = [
      { mode: InteractionMode.Camera, icon: '🎥', label: 'Camera', shortcut: 'C' },
      { mode: InteractionMode.Grab, icon: '✋', label: 'Grab', shortcut: 'G' },
      { mode: InteractionMode.Delete, icon: '🗑️', label: 'Delete', shortcut: 'D' },
      { mode: InteractionMode.Edit, icon: '✏️', label: 'Edit', shortcut: 'E' }
    ];

    this.container = this.createToolbar();
    this.setupModeChangeListener();
  }

  private onRestart: (() => void) | null = null;

  /**
   * Set callback for restart action
   */
  setOnRestart(callback: () => void): void {
    this.onRestart = callback;
  }

  /**
   * Create the toolbar DOM element
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'toolbar-buttons';

    // Create buttons for each mode
    for (const config of this.buttonConfigs) {
      const button = this.createButton(config);
      buttonContainer.appendChild(button);
      this.buttons.set(config.mode, button);
    }

    // Add restart button
    const restartButton = this.createRestartButton();
    buttonContainer.appendChild(restartButton);

    toolbar.appendChild(buttonContainer);
    document.body.appendChild(toolbar);

    // Set initial active state
    this.updateActiveButton(this.modeManager.currentMode);

    return toolbar;
  }

  /**
   * Create restart button
   */
  private createRestartButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'toolbar-button toolbar-button-action';

    const icon = document.createElement('span');
    icon.className = 'toolbar-icon';
    icon.textContent = '🔄';

    const label = document.createElement('span');
    label.className = 'toolbar-label';
    label.textContent = 'Restart';

    const shortcut = document.createElement('span');
    shortcut.className = 'toolbar-shortcut';
    shortcut.textContent = '(R)';

    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(shortcut);

    // Add click handler
    button.addEventListener('click', () => {
      if (this.onRestart) {
        this.onRestart();
      }
    });

    return button;
  }

  /**
   * Create a toolbar button
   */
  private createButton(config: ToolbarButton): HTMLElement {
    const button = document.createElement('button');
    button.className = 'toolbar-button';
    button.setAttribute('data-mode', config.mode);

    const icon = document.createElement('span');
    icon.className = 'toolbar-icon';
    icon.textContent = config.icon;

    const label = document.createElement('span');
    label.className = 'toolbar-label';
    label.textContent = config.label;

    const shortcut = document.createElement('span');
    shortcut.className = 'toolbar-shortcut';
    shortcut.textContent = `(${config.shortcut})`;

    button.appendChild(icon);
    button.appendChild(label);
    button.appendChild(shortcut);

    // Add click handler
    button.addEventListener('click', () => {
      this.modeManager.setMode(config.mode);
    });

    return button;
  }

  /**
   * Setup listener for mode changes
   */
  private setupModeChangeListener(): void {
    this.modeManager.onModeChange((mode) => {
      this.updateActiveButton(mode);
    });
  }

  /**
   * Update the active button styling
   */
  private updateActiveButton(activeMode: InteractionMode): void {
    for (const [mode, button] of this.buttons) {
      if (mode === activeMode) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  /**
   * Get the toolbar container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Dispose of the toolbar
   */
  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

