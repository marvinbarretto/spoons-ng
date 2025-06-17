// src/app/shared/ui/virtual-list/virtual-list.component.ts
import {
  Component,
  input,
  output,
  computed,
  signal,
  effect,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type VirtualListConfig = {
  itemHeight: number;          // Fixed height per item (px)
  containerHeight: number;     // Visible container height (px)
  overscan?: number;          // Extra items to render outside viewport (default: 5)
  threshold?: number;         // Items to render before considering virtual scrolling (default: 100)
};

@Component({
  selector: 'app-virtual-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="virtual-list"
      [style.height.px]="config().containerHeight"
      (scroll)="onScroll($event)"
      #scrollContainer
    >
      <!-- Spacer for items above viewport -->
      <div
        class="virtual-spacer-top"
        [style.height.px]="topSpacerHeight()"
      ></div>

      <!-- Visible items -->
      <div class="virtual-items">
        @for (item of visibleItems(); track trackingFn()(item, $index)) {
          <div
            class="virtual-item"
            [style.height.px]="config().itemHeight"
          >
            <ng-content [ngTemplateOutlet]="itemTemplate()" [ngTemplateOutletContext]="{ $implicit: item, index: getItemIndex(item) }"></ng-content>
          </div>
        }
      </div>

      <!-- Spacer for items below viewport -->
      <div
        class="virtual-spacer-bottom"
        [style.height.px]="bottomSpacerHeight()"
      ></div>
    </div>

    <!-- Performance info (development only) -->
    @if (showDebugInfo()) {
      <div class="virtual-debug">
        <small>
          Rendering {{ visibleItems().length }} of {{ items().length }} items
          ({{ startIndex() }} - {{ endIndex() }})
        </small>
      </div>
    }
  `,
  styles: `
    .virtual-list {
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-background);
    }

    .virtual-spacer-top,
    .virtual-spacer-bottom {
      width: 100%;
      flex-shrink: 0;
    }

    .virtual-items {
      width: 100%;
    }

    .virtual-item {
      width: 100%;
      display: flex;
      align-items: stretch;
    }

    .virtual-debug {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-family: monospace;
      color: var(--color-text-secondary);
    }

    /* Smooth scrolling */
    .virtual-list {
      scroll-behavior: smooth;
    }

    /* Custom scrollbar */
    .virtual-list::-webkit-scrollbar {
      width: 8px;
    }

    .virtual-list::-webkit-scrollbar-track {
      background: var(--color-background);
    }

    .virtual-list::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 4px;
    }

    .virtual-list::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-secondary);
    }
  `
})
export class VirtualListComponent<T = any> {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  // ✅ Inputs
  readonly items = input.required<T[]>();
  readonly config = input.required<VirtualListConfig>();
  readonly itemTemplate = input.required<any>(); // TemplateRef
  readonly trackingFn = input<(item: T, index: number) => any>(() => (item: T, index: number) => index);
  readonly showDebugInfo = input<boolean>(false);

  // ✅ Scroll state
  private readonly _scrollTop = signal<number>(0);
  readonly scrollTop = this._scrollTop.asReadonly();

  // ✅ Virtual scrolling calculations
  readonly shouldUseVirtualScrolling = computed(() => {
    const threshold = this.config().threshold || 100;
    return this.items().length > threshold;
  });

  readonly startIndex = computed(() => {
    if (!this.shouldUseVirtualScrolling()) return 0;

    const { itemHeight, overscan = 5 } = this.config();
    const calculatedStart = Math.floor(this.scrollTop() / itemHeight) - overscan;
    return Math.max(0, calculatedStart);
  });

  readonly endIndex = computed(() => {
    if (!this.shouldUseVirtualScrolling()) return this.items().length - 1;

    const { itemHeight, containerHeight, overscan = 5 } = this.config();
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const calculatedEnd = this.startIndex() + visibleCount + (overscan * 2);
    return Math.min(this.items().length - 1, calculatedEnd);
  });

  readonly visibleItems = computed(() => {
    if (!this.shouldUseVirtualScrolling()) {
      return this.items();
    }

    const start = this.startIndex();
    const end = this.endIndex();
    return this.items().slice(start, end + 1);
  });

  readonly topSpacerHeight = computed(() => {
    if (!this.shouldUseVirtualScrolling()) return 0;
    return this.startIndex() * this.config().itemHeight;
  });

  readonly bottomSpacerHeight = computed(() => {
    if (!this.shouldUseVirtualScrolling()) return 0;
    const totalHeight = this.items().length * this.config().itemHeight;
    const visibleHeight = (this.endIndex() + 1) * this.config().itemHeight;
    return Math.max(0, totalHeight - visibleHeight);
  });

  // ✅ Outputs
  readonly scrolled = output<{ scrollTop: number; scrollPercent: number }>();
  readonly itemsRendered = output<{ startIndex: number; endIndex: number; count: number }>();

  // ✅ Effects
  constructor() {
    // Emit render info when visible items change
    effect(() => {
      const start = this.startIndex();
      const end = this.endIndex();
      const count = this.visibleItems().length;

      this.itemsRendered.emit({ startIndex: start, endIndex: end, count });
    });
  }

  // ✅ Event handlers
  onScroll(event: Event): void {
    const element = event.target as HTMLDivElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    this._scrollTop.set(scrollTop);

    const scrollPercent = scrollHeight > clientHeight
      ? (scrollTop / (scrollHeight - clientHeight)) * 100
      : 0;

    this.scrolled.emit({ scrollTop, scrollPercent });
  }

  // ✅ Public API
  scrollToItem(index: number): void {
    if (!this.scrollContainer) return;

    const targetScrollTop = index * this.config().itemHeight;
    this.scrollContainer.nativeElement.scrollTop = targetScrollTop;
  }

  scrollToTop(): void {
    if (!this.scrollContainer) return;
    this.scrollContainer.nativeElement.scrollTop = 0;
  }

  getItemIndex(item: T): number {
    if (!this.shouldUseVirtualScrolling()) {
      return this.items().indexOf(item);
    }

    // For virtual scrolling, calculate the actual index
    const visibleIndex = this.visibleItems().indexOf(item);
    return this.startIndex() + visibleIndex;
  }
}
