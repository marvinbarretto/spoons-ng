import { Timestamp } from 'firebase/firestore';
import { CheckIn } from '../../check-in/utils/check-in.model';
import { Pub } from '../../pubs/utils/pub.models';
import { User } from '../../users/utils/user.model';

export const dummyUser: User = {
  uid: 'user1',
  landlordOf: [],
  claimedPubIds: [],
  checkedInPubIds: [],
  badges: [],
  streaks: {},
  joinedMissionIds: [],
  emailVerified: false,
  isAnonymous: false,
};

export const dummyPub: Pub = {
  id: 'pub1',
  name: 'The Test Pub',
  location: { lat: 0, lng: 0 },
  address: '',
};

export const dummyCheckin: Omit<CheckIn, 'id'> = {
  pubId: dummyPub.id,
  userId: dummyUser.uid,
  timestamp: Timestamp.fromDate(new Date()),
  dateKey: new Date().toISOString(),
};
