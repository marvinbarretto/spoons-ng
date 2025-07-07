import { Injectable, inject } from '@angular/core';
import { UserStore } from '../../users/data-access/user.store';

export type AvatarOption = {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private readonly userStore = inject(UserStore); // ✅ Use UserStore, not AuthStore

  private readonly DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x/bottts/svg';
  private readonly NPC_AVATAR_URL = 'assets/avatars/npc.webp';

  /**
   * Generate 14 deterministic DiceBear avatars + 1 NPC option
   */
  generateAvatarOptions(seed: string): AvatarOption[] {
    const avatars: AvatarOption[] = [];

    // Generate DiceBear avatars with different variations
    for (let i = 0; i < 14; i++) {
      const avatarSeed = `${seed}-${i}`;
      const url = `${this.DICEBEAR_BASE_URL}?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

      avatars.push({
        id: `dicebear-${i}`,
        name: `Avatar ${i + 1}`,
        url,
      });
    }

    // Add NPC option as 15th choice
    avatars.push({
      id: 'npc',
      name: 'Anonymous NPC',
      url: this.NPC_AVATAR_URL,
      isDefault: true
    });

    return avatars;
  }

  /**
   * ✅ CLEAN: Delegates to UserStore for all user operations
   */
  async selectAvatar(avatarOption: AvatarOption): Promise<void> {
    try {
      await this.userStore.updateAvatar(avatarOption.url);
      console.log('[AvatarService] ✅ Avatar updated:', avatarOption.name);
    } catch (error) {
      console.error('[AvatarService] ❌ Failed to update avatar:', error);
      throw error;
    }
  }

  /**
   * Get avatar URL with fallback logic
   */
  getAvatarUrl(user?: any): string {
    if (!user) return this.NPC_AVATAR_URL;
    if (user.photoURL && user.photoURL !== '') return user.photoURL;
    if (user.isAnonymous) return this.NPC_AVATAR_URL;
    return this.generateSingleAvatar(user.uid);
  }

  /**
   * Get the current user's selected avatar URL
   */
  getCurrentUserAvatarUrl(): string | null {
    const user = this.userStore.user();
    if (!user) return null;
    if (user.photoURL && user.photoURL !== '') return user.photoURL;
    if (user.isAnonymous) return this.NPC_AVATAR_URL;
    return null;
  }

  /**
   * Generate a single avatar URL for a given seed
   */
  generateSingleAvatar(seed: string): string {
    return `${this.DICEBEAR_BASE_URL}?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }

  /**
   * Check if current user has selected a custom avatar
   */
  hasCustomAvatar(): boolean {
    const user = this.userStore.user();
    if (!user) return false;
    return user.photoURL !== null && user.photoURL !== this.NPC_AVATAR_URL;
  }
}
