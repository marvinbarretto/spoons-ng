import { Component, input } from '@angular/core';

import type { Pub } from '../../../pubs/utils/pub.models';

@Component({
  selector: 'app-pub-chip',
  imports: [],
  template: `
    <div
      class="pub-chip"
      [class.pub-chip--completed]="hasVisited()"
      [class.pub-chip--clickable]="clickable()"
      [class.pub-chip--ghost]="!clickable()"
      [title]="pub().name"
    >
      <div class="pub-chip__icon">
        @if (hasVisited()) {
          ✅
        } @else {
          🍺
        }
      </div>
      <div class="pub-chip__content">
        <div class="pub-chip__name">{{ pub().name }}</div>
        @if (showLocation() && pub().city) {
          <div class="pub-chip__location">{{ pub().city }}</div>
        }
        @if (hasVisited() && visitCount() > 1) {
          <div class="pub-chip__visits">{{ visitCount() }} visits</div>
        }
      </div>
      @if (showCarpet() && pub().carpetUrl) {
        <div class="pub-chip__carpet-preview">
          <img
            [src]="pub().carpetUrl"
            [alt]="'Carpet at ' + pub().name"
            class="carpet-thumbnail"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .pub-chip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      width: 100%;
    }

    /* Clickable (solid) styling */
    .pub-chip--clickable {
      background: var(--background-lightest);
      border: 1px solid var(--border);
      cursor: pointer;
    }

    .pub-chip--clickable:hover {
      background: var(--background-lighter);
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow);
    }

    /* Ghost (non-clickable) styling */
    .pub-chip--ghost {
      background: transparent;
      border: 1px solid var(--border);
      opacity: 0.7;
      cursor: default;
    }

    .pub-chip--clickable.pub-chip--completed {
      background: var(--secondary);
      border-color: var(--success);
    }

    .pub-chip--clickable.pub-chip--completed:hover {
      background: var(--secondaryHover);
      border-color: var(--success);
    }

    .pub-chip--ghost.pub-chip--completed {
      background: transparent;
      border-color: var(--success);
      color: var(--success);
      opacity: 0.8;
    }

    .pub-chip__icon {
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--background-darker);
    }

    .pub-chip--clickable.pub-chip--completed .pub-chip__icon {
      background: var(--success);
      color: var(--onPrimary);
    }

    .pub-chip--ghost .pub-chip__icon {
      background: transparent;
      color: var(--text-muted);
    }

    .pub-chip--ghost.pub-chip--completed .pub-chip__icon {
      background: transparent;
      color: var(--success);
    }

    .pub-chip__content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .pub-chip__name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.3;
      word-break: break-word;
    }

    .pub-chip--clickable.pub-chip--completed .pub-chip__name {
      color: var(--success);
    }

    .pub-chip--ghost .pub-chip__name {
      color: var(--text-muted);
    }

    .pub-chip--ghost.pub-chip--completed .pub-chip__name {
      color: var(--success);
    }

    .pub-chip__location {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.2;
    }

    .pub-chip__visits {
      font-size: 0.6875rem;
      color: var(--success);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .pub-chip__carpet-preview {
      flex-shrink: 0;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .carpet-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }

    .pub-chip--clickable:hover .carpet-thumbnail {
      transform: scale(1.05);
    }

    /* Dark mode styles handled by theme tokens */
  `
})
export class PubChipComponent {
  // Required inputs
  readonly pub = input.required<Pub>();
  readonly hasVisited = input<boolean>(false);

  // Optional inputs
  readonly visitCount = input<number>(0);
  readonly showLocation = input<boolean>(true);
  readonly showCarpet = input<boolean>(false);
  readonly clickable = input<boolean>(false);
}
