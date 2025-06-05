export type User = {
  uid: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
  joinedAt?: string;

  landlordOf: string[];
  claimedPubIds: string[];
  checkedInPubIds: string[];
  badges: string[];
  streaks: Record<string, number>;

  joinedMissionIds: string[];
};
