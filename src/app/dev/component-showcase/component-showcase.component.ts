import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { LoadingStateComponent } from '../../shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PubCardLightComponent } from '../../pubs/ui/pub-card-light/pub-card-light.component';
import { PubCardComponent } from '../../pubs/ui/pub-card/pub-card.component';
import { ThemeStore } from '../../shared/data-access/theme.store';
import { ChipStatusComponent } from '../../shared/ui/chips/chip-status/chip-status.component';
import { ChipCountComponent } from '../../shared/ui/chips/chip-count/chip-count.component';
import { ChipFilterComponent } from '../../shared/ui/chips/chip-filter/chip-filter.component';
import { ChipProgressComponent } from '../../shared/ui/chips/chip-progress/chip-progress.component';
import { ChipIconComponent } from '../../shared/ui/chips/chip-icon/chip-icon.component';
import { ChipBadgeComponent } from '../../shared/ui/chips/chip-badge/chip-badge.component';
import { ChipUserComponent } from '../../shared/ui/chips/chip-user/chip-user.component';
import { BaseComponent } from '../../shared/base/base.component';
import { PropControlComponent } from './prop-control.component';
import { COMPONENT_METADATA, getComponentMetadata, generateDefaultProps } from './component-metadata';
import type { Pub } from '../../pubs/utils/pub.models';

interface ComponentCategory {
  name: string;
  icon: string;
  components: ComponentExample[];
}

interface ComponentExample {
  name: string;
  component: any;
  description: string;
  imports?: any[];
  examples: ExampleConfig[];
}

interface ExampleConfig {
  title: string;
  props: Record<string, any>;
  template?: string;
}

@Component({
  selector: 'app-component-showcase',
  imports: [
    CommonModule,
    RouterModule,
    IconComponent,
    ButtonComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PubCardLightComponent,
    PubCardComponent,
    PropControlComponent,
    ChipStatusComponent,
    ChipCountComponent,
    ChipFilterComponent,
    ChipProgressComponent,
    ChipIconComponent,
    // ChipBadgeComponent, // Removed - not used in template
    ChipUserComponent
  ],
  template: `
    <div class="showcase">
      <header class="showcase__header">
        <div class="showcase__header-content">
          <h1>
            <app-icon name="palette" size="xl" weight="medium" />
            Component Showcase
          </h1>
          <div class="showcase__actions">
            <app-button
              variant="ghost"
              size="sm"
              (onClick)="toggleTheme()"
            >
              <app-icon [name]="isDarkTheme() ? 'light_mode' : 'dark_mode'" />
              {{ currentTheme() }}
            </app-button>
          </div>
        </div>
      </header>

      <div class="showcase__container">
        <nav class="showcase__nav">
          <h2>Components</h2>
          @for (category of categories(); track category.name) {
            <div class="nav-category">
              <h3>
                <app-icon [name]="category.icon" size="sm" />
                {{ category.name }}
              </h3>
              <ul>
                @for (comp of category.components; track comp.name) {
                  <li>
                    <button
                      type="button"
                      [class.active]="activeComponent() === comp.name"
                      (click)="setActiveComponent(comp.name)"
                      class="nav-item-button"
                    >
                      {{ comp.name }}
                    </button>
                  </li>
                }
              </ul>
            </div>
          }
        </nav>

        <main class="showcase__content">
          @if (componentMetadata()) {
            <div class="component-workspace">
              <!-- Component Header -->
              <header class="component-header">
                <div class="component-info">
                  <h2>{{ componentMetadata()!.name }}</h2>
                  <p class="component-description">{{ componentMetadata()!.description }}</p>
                </div>
                <div class="component-actions">
                  <div class="preview-modes">
                    <button
                      type="button"
                      [class.active]="previewMode() === 'desktop'"
                      (click)="setPreviewMode('desktop')"
                      class="mode-button"
                      title="Desktop Preview"
                    >
                      <app-icon name="desktop_windows" size="sm" />
                    </button>
                    <button
                      type="button"
                      [class.active]="previewMode() === 'tablet'"
                      (click)="setPreviewMode('tablet')"
                      class="mode-button"
                      title="Tablet Preview"
                    >
                      <app-icon name="tablet" size="sm" />
                    </button>
                    <button
                      type="button"
                      [class.active]="previewMode() === 'mobile'"
                      (click)="setPreviewMode('mobile')"
                      class="mode-button"
                      title="Mobile Preview"
                    >
                      <app-icon name="smartphone" size="sm" />
                    </button>
                  </div>
                </div>
              </header>

              <!-- Main Content Grid -->
              <div class="workspace-grid">
                <!-- Live Preview -->
                <section class="preview-section">
                  <h3>
                    <app-icon name="visibility" size="sm" />
                    Live Preview
                  </h3>
                  <div
                    class="preview-container"
                    [class.preview-desktop]="previewMode() === 'desktop'"
                    [class.preview-tablet]="previewMode() === 'tablet'"
                    [class.preview-mobile]="previewMode() === 'mobile'"
                    [attr.data-mode]="previewMode()"
                  >
                    <div class="component-wrapper">
                    @switch (activeComponent()) {
                      @case ('Button') {
                        <app-button
                          [variant]="currentProps()['variant']"
                          [size]="currentProps()['size']"
                          [loading]="currentProps()['loading']"
                          [disabled]="currentProps()['disabled']"
                          [fullWidth]="currentProps()['fullWidth']"
                          [iconLeft]="currentProps()['iconLeft']"
                          [iconRight]="currentProps()['iconRight']"
                          [loadingText]="currentProps()['loadingText']">
                          {{ currentProps()['text'] }}
                        </app-button>
                      }
                      @case ('Icon') {
                        <app-icon
                          [name]="currentProps()['name']"
                          [size]="currentProps()['size']"
                          [filled]="currentProps()['filled']"
                          [weight]="currentProps()['weight']"
                          [interactive]="currentProps()['interactive']">
                        </app-icon>
                      }
                      @case ('LoadingState') {
                        <app-loading-state
                          [text]="currentProps()['text']">
                        </app-loading-state>
                      }
                      @case ('ErrorState') {
                        <app-error-state
                          [message]="currentProps()['message']"
                          [showRetry]="currentProps()['showRetry']"
                          [retryText]="currentProps()['retryText']"
                          [icon]="currentProps()['icon']">
                        </app-error-state>
                      }
                      @case ('EmptyState') {
                        <app-empty-state
                          [title]="currentProps()['title']"
                          [subtitle]="currentProps()['subtitle']"
                          [icon]="currentProps()['icon']"
                          [showAction]="currentProps()['showAction']"
                          [actionText]="currentProps()['actionText']">
                        </app-empty-state>
                      }
                      @case ('PubCardLight') {
                        <app-pub-card-light
                          [pub]="mockPub()"
                          [distance]="currentProps()['distance']"
                          [variant]="currentProps()['variant']"
                          [showAddress]="currentProps()['showAddress']"
                          [showLocation]="currentProps()['showLocation']"
                          [showDistance]="currentProps()['showDistance']"
                          [isLocalPub]="currentProps()['isLocalPub']"
                          [hasVerifiedVisit]="currentProps()['hasVerifiedVisit']"
                          [hasUnverifiedVisit]="currentProps()['hasUnverifiedVisit']"
                          [isNearestUnvisited]="currentProps()['isNearestUnvisited']">
                        </app-pub-card-light>
                      }
                      @case ('PubCard') {
                        <app-pub-card
                          [pub]="mockPubWithDistance()"
                          [selectable]="currentProps()['selectable']"
                          [isSelected]="currentProps()['isSelected']"
                          [hasCheckedIn]="currentProps()['hasCheckedIn']"
                          [checkinCount]="currentProps()['checkinCount']"
                          [showCheckinCount]="currentProps()['showCheckinCount']"
                          [isLocalPub]="currentProps()['isLocalPub']"
                          [hasVerifiedVisit]="currentProps()['hasVerifiedVisit']"
                          [hasUnverifiedVisit]="currentProps()['hasUnverifiedVisit']"
                          [isNearestUnvisited]="currentProps()['isNearestUnvisited']">
                        </app-pub-card>
                      }
                      @case ('ChipStatus') {
                        <app-chip-status
                          [type]="currentProps()['type']"
                          [text]="currentProps()['text']"
                          [icon]="currentProps()['icon']"
                          [size]="currentProps()['size']"
                          [showIcon]="currentProps()['showIcon']"
                          [tooltip]="currentProps()['tooltip']"
                          [animated]="currentProps()['animated']">
                        </app-chip-status>
                      }
                      @case ('ChipCount') {
                        <app-chip-count
                          [count]="currentProps()['count']"
                          [prefix]="currentProps()['prefix']"
                          [suffix]="currentProps()['suffix']"
                          [icon]="currentProps()['icon']"
                          [label]="currentProps()['label']"
                          [size]="currentProps()['size']"
                          [variant]="currentProps()['variant']"
                          [clickable]="currentProps()['clickable']"
                          [formatLargeNumbers]="currentProps()['formatLargeNumbers']"
                          [showSign]="currentProps()['showSign']">
                        </app-chip-count>
                      }
                      @case ('ChipFilter') {
                        <app-chip-filter
                          [label]="currentProps()['label']"
                          [active]="currentProps()['active']"
                          [count]="currentProps()['count']"
                          [icon]="currentProps()['icon']"
                          [size]="currentProps()['size']"
                          [disabled]="currentProps()['disabled']"
                          [removable]="currentProps()['removable']"
                          [formatNumbers]="currentProps()['formatNumbers']">
                        </app-chip-filter>
                      }
                      @case ('ChipProgress') {
                        <app-chip-progress
                          [state]="currentProps()['state']"
                          [label]="currentProps()['label']"
                          [value]="currentProps()['value']"
                          [maxValue]="currentProps()['maxValue']"
                          [size]="currentProps()['size']"
                          [showIcon]="currentProps()['showIcon']"
                          [showProgress]="currentProps()['showProgress']"
                          [showValue]="currentProps()['showValue']"
                          [isActive]="currentProps()['isActive']"
                          [unit]="currentProps()['unit']">
                        </app-chip-progress>
                      }
                      @case ('ChipIcon') {
                        <app-chip-icon
                          [icon]="currentProps()['icon']"
                          [label]="currentProps()['label']"
                          [count]="currentProps()['count']"
                          [size]="currentProps()['size']"
                          [variant]="currentProps()['variant']"
                          [clickable]="currentProps()['clickable']"
                          [filled]="currentProps()['filled']"
                          [weight]="currentProps()['weight']">
                        </app-chip-icon>
                      }
                      @case ('ChipUser') {
                        <app-chip-user
                          [user]="mockUser()"
                          [size]="currentProps()['size']"
                          [variant]="currentProps()['variant']"
                          [showName]="currentProps()['showName']"
                          [clickable]="currentProps()['clickable']">
                        </app-chip-user>
                      }
                      @default {
                        <div class="component-placeholder">
                          <app-icon name="widgets" size="xl" />
                          <p>Component preview for: {{ activeComponent() }}</p>
                          <small>Direct component rendering not yet implemented for this component.</small>
                        </div>
                      }
                    }
                    </div>
                  </div>
                </section>

                <!-- Props Controls -->
                <section class="controls-section">
                  <h3>
                    <app-icon name="tune" size="sm" />
                    Properties
                  </h3>
                  <div class="controls-grid">
                    @for (propEntry of componentMetadata()!.props | keyvalue; track propEntry.key) {
                      <app-prop-control
                        [control]="propEntry.value"
                        [value]="currentProps()[propEntry.key]"
                        (valueChange)="updateProp(propEntry.key, $event)"
                      />
                    }
                  </div>
                  <div class="controls-actions">
                    <button
                      type="button"
                      class="reset-all-button"
                      (click)="resetAllProps()"
                    >
                      <app-icon name="refresh" size="sm" />
                      Reset All
                    </button>
                  </div>
                </section>


                <!-- Examples -->
                @if (componentMetadata()!.examples.length > 0) {
                  <section class="examples-section">
                    <h3>
                      <app-icon name="auto_awesome" size="sm" />
                      Preset Examples
                    </h3>
                    <div class="examples-grid">
                      @for (example of componentMetadata()!.examples; track example.title) {
                        <button
                          type="button"
                          class="example-preset"
                          (click)="loadExample(example.props)"
                        >
                          <h4>{{ example.title }}</h4>
                          @if (example.description) {
                            <p>{{ example.description }}</p>
                          }
                        </button>
                      }
                    </div>
                  </section>
                }
              </div>
            </div>
          } @else {
            <div class="welcome">
              <app-icon name="auto_awesome" size="xl" />
              <h2>Welcome to Component Showcase</h2>
              <p>Select a component from the navigation to start exploring and customizing.</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--background);
    }

    .showcase {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .showcase__header {
      background: var(--background-lighter);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .showcase__header-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .showcase__header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: clamp(1.5rem, 1.25rem + 0.5vw, 2rem);
    }

    .showcase__container {
      display: grid;
      grid-template-columns: 280px 1fr;
      flex: 1;
      overflow: hidden;
    }

    .showcase__nav {
      background: var(--background-lighter);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 2rem 1rem;
    }

    .showcase__nav h2 {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
      margin: 0 0 1rem 1rem;
      letter-spacing: 0.1em;
    }

    .nav-category {
      margin-bottom: 2rem;
    }

    .nav-category h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      margin: 0 0 0.5rem 0;
      padding: 0.5rem 1rem;
      color: var(--text-secondary);
    }

    .nav-category ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-item-button {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem 0.5rem 3rem;
      color: var(--text);
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 0.5rem;
      font-family: inherit;
      font-size: inherit;
    }

    .nav-item-button:hover {
      background: var(--background-lightest);
      color: var(--primary);
    }

    .nav-item-button.active {
      background: var(--primary);
      color: var(--on-primary);
    }

    .nav-item-button:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .showcase__content {
      overflow-y: auto;
      padding: 2rem;
    }

    .component-section {
      max-width: 900px;
      margin: 0 auto;
    }

    .component-description {
      color: var(--text-secondary);
      margin: 1rem 0 2rem;
      font-size: 1.125rem;
    }

    .example-container {
      margin-bottom: 3rem;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .example-container h3 {
      margin: 0;
      padding: 1rem 1.5rem;
      background: var(--background-lighter);
      border-bottom: 1px solid var(--border);
      font-size: 1rem;
    }

    .example-preview {
      padding: 2rem;
      background: var(--background);
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .example-placeholder {
      color: var(--text-muted);
      font-style: italic;
    }

    .example-code {
      border-top: 1px solid var(--border);
    }

    .example-code summary {
      padding: 1rem 1.5rem;
      background: var(--background-lighter);
      cursor: pointer;
      user-select: none;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .example-code pre {
      margin: 0;
      padding: 1.5rem;
      background: var(--background-darker);
      overflow-x: auto;
    }

    .example-code code {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text);
    }

    .welcome {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .welcome h2 {
      margin: 1rem 0;
    }

    /* Component Workspace Styles */
    .component-workspace {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 1400px;
      margin: 0 auto;
    }

    .component-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .component-info h2 {
      margin: 0 0 0.5rem 0;
      font-size: clamp(1.5rem, 1.25rem + 0.5vw, 2rem);
    }

    .component-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: 1.125rem;
    }

    .preview-modes {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem;
      background: var(--background-lighter);
      border-radius: 0.5rem;
    }

    .mode-button {
      background: none;
      border: none;
      padding: 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .mode-button:hover {
      background: var(--background-lightest);
      color: var(--text);
    }

    .mode-button.active {
      background: var(--primary);
      color: var(--on-primary);
    }

    .workspace-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 2rem;
      flex: 1;
      overflow: hidden;
    }

    .workspace-grid section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .workspace-grid h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 1rem;
      color: var(--text-secondary);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .preview-section {
      grid-row: 1 / 3;
    }

    .preview-container {
      flex: 1;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 2rem;
      min-height: 300px;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      transition: all 0.3s ease;
      position: relative;
    }

    .preview-container::before {
      content: attr(data-mode);
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: var(--primary);
      color: var(--on-primary);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      z-index: 1;
    }

    .component-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    .component-wrapper > * {
      max-width: 100%;
      word-wrap: break-word;
    }

    .preview-desktop {
      max-width: 100%;
    }

    .preview-desktop .component-wrapper {
      width: 100%;
      background: var(--background);
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .preview-tablet {
      max-width: 768px;
      margin: 0 auto;
      border: 2px solid var(--border-strong);
      border-radius: 1rem;
      background: var(--background-darker);
    }

    .preview-tablet .component-wrapper {
      width: 768px;
      background: var(--background);
      border-radius: 0.75rem;
      padding: 1rem;
      margin: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .preview-mobile {
      max-width: 375px;
      margin: 0 auto;
      border: 3px solid var(--border-strong);
      border-radius: 1.5rem;
      background: var(--background-darker);
      position: relative;
    }

    .preview-mobile::after {
      content: '';
      position: absolute;
      top: 0.5rem;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 4px;
      background: var(--text-muted);
      border-radius: 2px;
    }

    .preview-mobile .component-wrapper {
      width: 375px;
      background: var(--background);
      border-radius: 1rem;
      padding: 1rem;
      margin: 1rem 0.5rem 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .component-placeholder {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
    }

    .component-placeholder p {
      margin: 1rem 0 0.5rem;
      font-size: 1rem;
    }

    .component-placeholder small {
      font-size: 0.875rem;
    }

    .controls-section {
      overflow-y: auto;
    }

    .controls-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .controls-actions {
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .reset-all-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s;
    }

    .reset-all-button:hover {
      background: var(--background-lightest);
      border-color: var(--primary);
    }


    .examples-section {
      grid-column: 1 / -1;
    }

    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .example-preset {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }

    .example-preset:hover {
      background: var(--background-lightest);
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .example-preset h4 {
      margin: 0 0 0.5rem 0;
      color: var(--text);
      font-size: 1rem;
    }

    .example-preset p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 1200px) {
      .workspace-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto auto;
      }

      .preview-section {
        grid-row: 1;
      }

      .controls-section {
        max-height: none;
        overflow-y: visible;
      }
    }

    @media (max-width: 768px) {
      .showcase__container {
        grid-template-columns: 1fr;
      }

      .showcase__nav {
        display: none;
      }

      .component-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .workspace-grid {
        gap: 1rem;
      }

      .preview-container {
        padding: 1rem;
      }
    }
  `]
})
export class ComponentShowcaseComponent extends BaseComponent {
  protected readonly themeStore = inject(ThemeStore);

  readonly isDarkTheme = computed(() => this.themeStore.isDark());

  readonly currentTheme = computed(() => {
    const theme = this.themeStore.themeType();
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  });

  readonly activeComponent = signal<string>('');
  readonly liveProps = signal<Record<string, any>>({});
  readonly selectedExample = signal<number>(0);
  readonly previewMode = signal<'desktop' | 'tablet' | 'mobile'>('desktop');

  readonly componentMetadata = computed(() => {
    const active = this.activeComponent();
    return getComponentMetadata(active);
  });

  readonly currentProps = computed(() => {
    const metadata = this.componentMetadata();
    const live = this.liveProps();

    if (!metadata) return {};

    // Merge default props with live props
    const defaults = generateDefaultProps(metadata.name);
    return { ...defaults, ...live };
  });

  readonly mockPub = computed((): Pub => {
    const props = this.currentProps();
    return {
      id: 'mock-pub-id',
      name: props['pubName'] || 'The Crown & Anchor',
      address: props['pubAddress'] || '123 High Street, London',
      city: props['pubCity'] || 'London',
      region: props['pubRegion'] || 'Greater London',
      country: 'United Kingdom',
      location: { lat: 51.5074, lng: -0.1278 },
      hasCarpet: true,
      checkinCount: 42,
      longestStreak: 7
    };
  });

  readonly mockPubWithDistance = computed((): Pub & { distance: number | null } => {
    const basePub = this.mockPub();
    const props = this.currentProps();
    return {
      ...basePub,
      distance: props['distance'] || 250
    };
  });

  readonly mockBadge = computed(() => ({
    id: 'first-checkin',
    name: 'First Check-in',
    description: 'Complete your first pub check-in',
    emoji: '🌟',
    condition: 'checkInCount >= 1',
    awardedCount: 1,
    type: 'milestone' as const,
    category: 'basic' as const,
    rarity: 'common' as const,
    points: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  readonly mockUser = computed(() => ({
    displayName: 'John Doe',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    email: 'john.doe@example.com',
    realDisplayName: 'John Doe'
  }));


  readonly categories = computed(() => {
    const allComponents = Object.values(COMPONENT_METADATA);
    const groupedByCategory: Record<string, ComponentExample[]> = {};

    // Group components by category
    allComponents.forEach(comp => {
      if (!groupedByCategory[comp.category]) {
        groupedByCategory[comp.category] = [];
      }
      groupedByCategory[comp.category].push({
        name: comp.name,
        component: null, // We'll handle component creation dynamically
        description: comp.description,
        examples: comp.examples
      });
    });

    // Convert to category structure with appropriate icons
    const categoryIcons: Record<string, string> = {
      'Core Controls': 'widgets',
      'State Components': 'pending',
      'Chips & Tags': 'label',
      'Data Display': 'table_view',
      'Visual Components': 'image',
      'Feedback & Notifications': 'feedback'
    };

    return Object.entries(groupedByCategory).map(([categoryName, components]) => ({
      name: categoryName,
      icon: categoryIcons[categoryName] || 'category',
      components
    }));
  });

  readonly selectedComponent = computed(() => {
    const active = this.activeComponent();
    for (const category of this.categories()) {
      const comp = category.components.find(c => c.name === active);
      if (comp) return comp;
    }

    // Auto-select first component if none selected
    if (!active && this.categories().length > 0) {
      const firstCategory = this.categories()[0];
      if (firstCategory.components.length > 0) {
        const firstComponent = firstCategory.components[0];
        // Use setTimeout to avoid triggering during computed
        setTimeout(() => this.setActiveComponent(firstComponent.name), 0);
        return firstComponent;
      }
    }

    return null;
  });

  setActiveComponent(name: string): void {
    this.activeComponent.set(name);
    // Reset props to defaults when switching components
    this.liveProps.set({});
  }

  setPreviewMode(mode: 'desktop' | 'tablet' | 'mobile'): void {
    console.log('🖥️ Preview mode changed:', mode);
    console.log('📱 Previous mode:', this.previewMode());
    this.previewMode.set(mode);
    console.log('✅ New mode set:', this.previewMode());
  }

  updateProp(key: string, value: any): void {
    const current = this.liveProps();
    this.liveProps.set({ ...current, [key]: value });
  }

  resetAllProps(): void {
    this.liveProps.set({});
  }

  loadExample(exampleProps: Record<string, any>): void {
    this.liveProps.set(exampleProps);
  }


  toggleTheme(): void {
    const themes = this.themeStore.getAllThemes();
    const currentTheme = this.themeStore.themeType();
    const currentIndex = themes.findIndex(t => t.type === currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.themeStore.setTheme(themes[nextIndex].type);
  }
}
