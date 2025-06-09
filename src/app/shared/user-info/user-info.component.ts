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
  @Input({ required: true }) displayName!: string;


  readonly user = input.required<Signal<User | null>>();
  readonly isAnonymous = input.required<Signal<boolean>>();
  readonly onLogin = input.required<() => void>();
  readonly onLogout = input.required<() => void>();



  readonly currentUser = computed(() => this.user()?.());

  constructor() {
// TODO: do we need to create side effects?
  }
}
