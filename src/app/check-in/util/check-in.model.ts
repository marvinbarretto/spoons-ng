import { Timestamp } from "firebase/firestore";

export type CheckIn = {
  id: string;
  userId: string;
  pubId: string;
  timestamp: Timestamp;
  dateKey: string;
  madeUserLandlord?: boolean;
  badgeName?: string;
  missionUpdated?: boolean;
};
