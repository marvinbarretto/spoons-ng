import { EarnedBadge } from '@badges/utils/badge.model';
import { User } from '@users/utils/user.model';

export type AuthUser = {
  uid: string;
  displayName: string;
  isAnonymous: boolean;
  email?: string;
  emailVerified: boolean;
  photoURL?: string;
  landlordOf: string[];
  claimedPubIds: string[];
  checkedInPubIds: string[];
  badges: EarnedBadge[];
  streaks: Record<string, number>;
  joinedMissionIds: string[];
  joinedAt: string;
};

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface RegisterForm extends RegisterPayload {
  confirmPassword: string;
}

