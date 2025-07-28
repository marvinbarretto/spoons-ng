// src/app/shared/pipes/user-display.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { UserStore } from '@users/data-access/user.store';

@Pipe({
  name: 'userDisplay',
  standalone: true,
  pure: false // Need to be impure to react to UserStore changes
})
export class UserDisplayPipe implements PipeTransform {
  private readonly userStore = inject(UserStore);

  constructor() {
    // Ensure user data is loaded when pipe is first used
    this.userStore.loadOnce();
  }

  transform(userId: string | null | undefined): string {
    if (!userId) return 'Unknown User';
    
    const users = this.userStore.data();
    const user = users.find(u => u.uid === userId);
    
    // Return displayName if found, otherwise show more of the user ID
    return user?.displayName || `${userId.slice(0, 12)}...`;
  }
}