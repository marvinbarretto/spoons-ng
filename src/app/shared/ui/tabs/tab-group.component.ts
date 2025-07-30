import { Component, computed, input, output, signal } from '@angular/core';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'ff-tab-group',
  template: `
    <div class="tab-group" [attr.role]="'tablist'">
      <!-- Tab Navigation -->
      <div class="tab-nav">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            class="tab-button"
            [class.active]="currentTab() === tab.id"
            [class.disabled]="tab.disabled"
            [attr.role]="'tab'"
            [attr.aria-selected]="currentTab() === tab.id"
            [attr.aria-controls]="getTabPanelId(tab.id)"
            [attr.id]="getTabId(tab.id)"
            [attr.tabindex]="currentTab() === tab.id ? 0 : -1"
            [disabled]="tab.disabled"
            (click)="selectTab(tab.id)"
            (keydown)="onTabKeydown($event, tab.id)"
          >
            @if (tab.icon) {
              <span class="tab-icon">{{ tab.icon }}</span>
            }
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- Tab Content -->
      <div class="tab-content" [attr.role]="'tabpanel'">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .tab-group {
      width: 100%;
    }

    .tab-nav {
      display: flex;
      border-bottom: 2px solid var(--border);
      background: var(--background);
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-nav::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border: none;
      background: none;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 1rem;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-bottom: 2px solid transparent;
      position: relative;
      transform: translateY(0);
    }

    .tab-button:hover:not(.disabled) {
      color: var(--text);
      background: var(--background-lighter);
      transform: translateY(-1px);
    }

    .tab-button:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: -2px;
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: var(--background-lighter);
    }

    .tab-button.disabled {
      color: var(--text-muted);
      cursor: not-allowed;
      opacity: 0.5;
    }

    .tab-icon {
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tab-label {
      font-weight: 500;
    }

    .tab-content {
      padding: 1.5rem 0;
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .tab-button {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }

      .tab-content {
        padding: 1rem 0;
      }
    }

    @media (max-width: 480px) {
      .tab-nav {
        gap: 0;
      }

      .tab-button {
        flex: 1;
        justify-content: center;
        min-width: 0;
        padding: 0.75rem 0.5rem;
      }

      .tab-label {
        font-size: 0.85rem;
      }
    }
  `,
})
export class TabGroupComponent {
  // Input signals
  readonly tabs = input.required<Tab[]>();
  readonly selectedTab = input<string>('');

  // Output events
  readonly tabChange = output<string>();

  // Internal state
  private readonly _selectedTab = signal<string>('');

  // Computed properties
  readonly currentTab = computed(() => {
    const selected = this.selectedTab();
    const internalSelected = this._selectedTab();
    return selected || internalSelected || this.tabs()[0]?.id || '';
  });

  selectTab(tabId: string): void {
    const tab = this.tabs().find(t => t.id === tabId);
    if (!tab || tab.disabled) return;

    this._selectedTab.set(tabId);
    this.tabChange.emit(tabId);
  }

  onTabKeydown(event: KeyboardEvent, tabId: string): void {
    const tabs = this.tabs().filter(t => !t.disabled);
    const currentIndex = tabs.findIndex(t => t.id === tabId);

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectTab(tabId);
        return;
    }

    if (newIndex !== currentIndex) {
      const newTab = tabs[newIndex];
      if (newTab) {
        this.selectTab(newTab.id);
        // Focus the new tab button
        setTimeout(() => {
          const tabButton = document.getElementById(this.getTabId(newTab.id));
          tabButton?.focus();
        });
      }
    }
  }

  getTabId(tabId: string): string {
    return `tab-${tabId}`;
  }

  getTabPanelId(tabId: string): string {
    return `tabpanel-${tabId}`;
  }
}
