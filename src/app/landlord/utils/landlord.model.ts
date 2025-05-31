import { Timestamp } from "firebase/firestore";

export type Landlord = {
  userId: string;
  claimedAt: Timestamp;
}
