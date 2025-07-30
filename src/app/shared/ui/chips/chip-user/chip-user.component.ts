import { Component, computed, input, output } from '@angular/core';

export type UserChipData = {
  displayName: string;
  photoURL?: string;
  email?: string;
  realDisplayName?: string;
};

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';
export type ChipVariant = 'default' | 'primary' | 'secondary';

@Component({
  selector: 'app-chip-user',
  template: `
    <div
      class="chip-user"
      [class]="chipClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()"
    >
      <img
        class="chip-avatar"
        [src]="avatarUrl()"
        [alt]="displayName()"
        onerror="this.src='assets/avatars/npc.webp'"
      />

      @if (showName()) {
        <span class="chip-text">{{ displayName() }}</span>
      }
    </div>
  `,
  styleUrl: './chip-user.component.scss',
})
export class ChipUserComponent {
  readonly user = input.required<UserChipData>();
  readonly size = input<ChipSize>('md');
  readonly variant = input<ChipVariant>('default');
  readonly showName = input(true);
  readonly clickable = input(false);
  readonly customClass = input<string>('');

  readonly clicked = output<UserChipData>();

  readonly displayName = computed(() => this.user().displayName || 'Unknown User');

  readonly avatarUrl = computed(() => {
    const user = this.user();

    if (user.photoURL) {
      return user.photoURL;
    }

    const isAnonymousUser =
      !user.email &&
      !user.realDisplayName &&
      (user.displayName?.includes('-') || user.displayName?.includes('(You)'));

    if (isAnonymousUser) {
      return 'assets/avatars/npc.webp';
    } else {
      return 'assets/images/default-user-avatar.png';
    }
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];

    classes.push(`size--${this.size()}`);
    classes.push(`variant--${this.variant()}`);

    if (this.clickable()) {
      classes.push('clickable');
    }

    if (this.customClass()) {
      classes.push(this.customClass());
    }

    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const name = this.displayName();
    const clickableText = this.clickable() ? ', clickable' : '';
    return `User ${name}${clickableText}`;
  });

  handleClick(): void {
    if (this.clickable()) {
      this.clicked.emit(this.user());
    }
  }
}
