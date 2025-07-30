// src/app/shared/ui/icon/icon.component.ts
import { Component, computed, input } from '@angular/core';

export type IconVariant = 'outlined' | 'filled' | 'rounded' | 'sharp';
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-icon',
  template: `
    <span
      class="material-symbols-outlined"
      [class]="iconClasses()"
      [style.font-size]="iconSize()"
      [attr.aria-hidden]="true"
    >
      {{ name() }}
    </span>
  `,
  styles: [
    `
      .material-symbols-outlined {
        font-variation-settings:
          'FILL' var(--icon-fill, 0),
          'wght' var(--icon-weight, 400),
          'GRAD' var(--icon-grade, 0),
          'opsz' var(--icon-optical-size, 24);

        /* ✅ Consistent baseline alignment */
        vertical-align: text-bottom;

        /* ✅ Prevent text selection */
        user-select: none;
        -webkit-user-select: none;

        /* ✅ Smooth transitions for interactive icons */
        transition: all 0.2s ease;
      }

      /* ✅ Size variants */
      .icon--xs {
        --icon-optical-size: 16;
      }
      .icon--sm {
        --icon-optical-size: 20;
      }
      .icon--md {
        --icon-optical-size: 24;
      }
      .icon--lg {
        --icon-optical-size: 32;
      }
      .icon--xl {
        --icon-optical-size: 40;
      }

      /* ✅ Fill variants */
      .icon--filled {
        --icon-fill: 1;
      }
      .icon--outlined {
        --icon-fill: 0;
      }

      /* ✅ Weight variants */
      .icon--light {
        --icon-weight: 300;
      }
      .icon--regular {
        --icon-weight: 400;
      }
      .icon--medium {
        --icon-weight: 500;
      }
      .icon--bold {
        --icon-weight: 700;
      }

      /* ✅ Interactive states */
      .icon--interactive {
        cursor: pointer;

        &:hover {
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    `,
  ],
})
export class IconComponent {
  // ✅ Required icon name
  readonly name = input.required<string>();

  // ✅ Optional customization
  readonly variant = input<IconVariant>('outlined');
  readonly size = input<IconSize>('md');
  readonly filled = input<boolean>(false);
  readonly weight = input<'light' | 'regular' | 'medium' | 'bold'>('regular');
  readonly interactive = input<boolean>(false);
  readonly customClass = input<string>('');

  // ✅ Computed classes
  readonly iconClasses = computed(() => {
    const classes: string[] = [];

    // Size class
    classes.push(`icon--${this.size()}`);

    // Fill state
    if (this.filled()) {
      classes.push('icon--filled');
    } else {
      classes.push('icon--outlined');
    }

    // Weight
    classes.push(`icon--${this.weight()}`);

    // Interactive
    if (this.interactive()) {
      classes.push('icon--interactive');
    }

    // Custom class
    if (this.customClass()) {
      classes.push(this.customClass());
    }

    return classes.join(' ');
  });

  // ✅ Computed font size for optical sizing
  readonly iconSize = computed(() => {
    const sizeMap: Record<IconSize, string> = {
      xs: '1rem', // 16px
      sm: '1.25rem', // 20px
      md: '1.5rem', // 24px
      lg: '2rem', // 32px
      xl: '2.5rem', // 40px
    };
    return sizeMap[this.size()];
  });
}
