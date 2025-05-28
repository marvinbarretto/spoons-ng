export type User = {
  uid: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
  joinedAt?: string;
  claimedPubIds?: string[]; // denormalized cache
};
