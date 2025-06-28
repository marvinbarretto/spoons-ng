// src/app/widgets/user-avatar/user-avatar.component.ts
import { Component, computed, inject, input, output } from '@angular/core';
import { AvatarService } from '../../shared/data-access/avatar.service';
import type { User } from '../../users/utils/user.model';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="user-avatar"
      [class]="avatarClasses()"
      [style]="avatarStyles()"
      [attr.title]="user()?.displayName || 'User avatar'"
      [attr.role]="clickable() ? 'button' : 'img'"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()">

      <img
        class="avatar-image"
        [src]="avatarUrl()"
        [alt]="user()?.displayName || 'User'"
        onerror="this.src='assets/avatars/npc.webp'"
        loading="lazy" />

      <!-- Subtle ring overlay for depth -->
      <div class="avatar-ring"></div>
    </div>
  `,
  styleUrl: './user-avatar.component.scss'
})
export class UserAvatarComponent {
  private readonly avatarService = inject(AvatarService);

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly size = input<AvatarSize>('md');
  readonly clickable = input(true);

  // ✅ Outputs
  readonly avatarClick = output<User | null>();

  // ✅ Computed properties
  readonly avatarUrl = computed(() => {
    const user = this.user();
    return this.avatarService.getAvatarUrl(user);
  });

  readonly userColor = computed(() => {
    const user = this.user();
    // For now, fallback to carpet brown - we'll add user.accentColor later
    const fallbackColor = '#8B4513'; // Carpet brown from our theme
    return user?.accentColor || fallbackColor;
  });

  readonly avatarClasses = computed(() => {
    const classes = [`size--${this.size()}`];

    if (this.clickable()) {
      classes.push('clickable');
    }

    return classes.join(' ');
  });

  readonly avatarStyles = computed(() => {
    const baseColor = this.userColor();
    const lightColor = this.hexToRgba(baseColor, 0.15); // 15% opacity background

    return {
      '--user-color': baseColor,
      '--user-color-light': lightColor,
    };
  });

  readonly ariaLabel = computed(() => {
    const name = this.user()?.displayName || 'User';
    const clickableText = this.clickable() ? ', click to customize' : '';
    return `${name} avatar${clickableText}`;
  });

  // ✅ Event handlers
  handleClick(): void {
    if (this.clickable()) {
      this.avatarClick.emit(this.user());
    }
  }

  // ✅ Utility functions
  private hexToRgba(hex: string, alpha: number): string {
    // Convert hex to rgba for background transparency
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
