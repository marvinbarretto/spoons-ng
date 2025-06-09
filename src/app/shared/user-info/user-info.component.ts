import { Component, ChangeDetectionStrategy, input, computed, Signal, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../ui/button/button.component';
import type { User } from '../../users/utils/user.model';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {

  // readonly shortName = input.required<Signal<string>>();
  @Input({ required: true }) shortName!: string;


  readonly user = input.required<Signal<User | null>>();
  readonly isAnonymous = input.required<Signal<boolean>>();
  readonly onLogin = input.required<() => void>();
  readonly onLogout = input.required<() => void>();



  readonly currentUser = computed(() => this.user()?.());

  constructor() {
    effect(() => {
      console.log('[UserInfoComponent] typeof shortName:', typeof this.shortName);
      console.log('[UserInfoComponent] shortName():', this.shortName);
      console.log('[UserInfoComponent] shortName()():', this.shortName); // ❌ PROVES it's double-wrapped
      console.log('[UserInfoComponent] shortName():', this.shortName); // ✅ string like "wobbly-barkeep-251"

    });
  }
}
