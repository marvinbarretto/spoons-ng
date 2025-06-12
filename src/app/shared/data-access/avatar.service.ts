// src/app/shared/data-access/avatar.service.ts
import { Injectable, inject } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserService } from '../../users/data-access/user.service';

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
  private readonly authStore = inject(AuthStore);
  private readonly userService = inject(UserService);

  // TODO: Replace with environment variables
  private readonly DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x/avataaars/svg';
  private readonly NPC_AVATAR_URL = 'assets/avatars/npc.webp';

  /**
   * Generate 11 deterministic DiceBear avatars + 1 NPC option
   * @param seed Base seed for avatar generation (usually user ID)
   * @returns Array of 12 avatar options
   */
  generateAvatarOptions(seed: string): AvatarOption[] {
    const avatars: AvatarOption[] = [];

    // Generate 11 DiceBear avatars with different variations
    for (let i = 0; i < 11; i++) {
      const avatarSeed = `${seed}-${i}`;
      const url = `${this.DICEBEAR_BASE_URL}?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

      avatars.push({
        id: `dicebear-${i}`,
        name: `Avatar ${i + 1}`,
        url,
      });
    }

    // Add NPC option as 12th choice
    avatars.push({
      id: 'npc',
      name: 'Anonymous NPC',
      url: this.NPC_AVATAR_URL,
      isDefault: true
    });

    return avatars;
  }

  /**
   * Get the current user's selected avatar URL
   * @returns Avatar URL or null if none selected
   */
  getCurrentUserAvatarUrl(): string | null {
    const user = this.authStore.user();
    if (!user) return null;

    // Check if user has selected an avatar
    if (user.photoURL && user.photoURL !== '') {
      return user.photoURL;
    }

    // Default to NPC for anonymous users
    if (user.isAnonymous) {
      return this.NPC_AVATAR_URL;
    }

    return null;
  }

  /**
   * Save selected avatar to user profile
   * @param avatarOption Selected avatar option
   */
  async selectAvatar(avatarOption: AvatarOption): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      // Update user's photoURL in Firebase
      await this.userService.updateUser(user.uid, {
        photoURL: avatarOption.url
      });

      console.log('[AvatarService] ✅ Avatar updated:', avatarOption.name);
    } catch (error) {
      console.error('[AvatarService] ❌ Failed to update avatar:', error);
      throw error;
    }
  }

  /**
   * Generate a single avatar URL for a given seed
   * @param seed Unique identifier for consistent avatar generation
   * @returns DiceBear avatar URL
   */
  generateSingleAvatar(seed: string): string {
    return `${this.DICEBEAR_BASE_URL}?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }

  /**
   * Get avatar URL with fallback logic
   * @param user User object (optional)
   * @returns Avatar URL with appropriate fallback
   */
  getAvatarUrl(user?: any): string {
    if (!user) {
      return this.NPC_AVATAR_URL;
    }

    // If user has selected an avatar, use it
    if (user.photoURL && user.photoURL !== '') {
      return user.photoURL;
    }

    // For anonymous users, default to NPC
    if (user.isAnonymous) {
      return this.NPC_AVATAR_URL;
    }

    // For authenticated users without avatar, generate one
    return this.generateSingleAvatar(user.uid);
  }

  /**
   * Check if current user has selected a custom avatar
   * @returns True if user has chosen an avatar (not default NPC)
   */
  hasCustomAvatar(): boolean {
    const avatarUrl = this.getCurrentUserAvatarUrl();
    return avatarUrl !== null && avatarUrl !== this.NPC_AVATAR_URL;
  }
}
