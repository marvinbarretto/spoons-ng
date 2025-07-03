import type { CheckIn } from '../../check-in/utils/check-in.models';
import { Timestamp } from 'firebase/firestore';

export function createMockCheckIn(overrides?: Partial<CheckIn>): CheckIn {
  const now = new Date();
  return {
    id: 'checkin-' + Math.random().toString(36).substr(2, 9),
    userId: 'test-user-id',
    pubId: 'test-pub-id',
    timestamp: Timestamp.fromDate(now),
    dateKey: now.toISOString().split('T')[0],
    ...overrides
  };
}

export function createCheckInsForUser(
  userId: string, 
  pubIds: string[], 
  startDate: Date = new Date()
): CheckIn[] {
  return pubIds.map((pubId, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() - index); // Each checkin on a different day
    
    return createMockCheckIn({
      userId,
      pubId,
      timestamp: Timestamp.fromDate(date),
      dateKey: date.toISOString().split('T')[0]
    });
  });
}

export function createCheckInStreak(
  userId: string,
  pubId: string,
  days: number
): CheckIn[] {
  const checkins: CheckIn[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    checkins.push(createMockCheckIn({
      userId,
      pubId,
      timestamp: Timestamp.fromDate(date),
      dateKey: date.toISOString().split('T')[0]
    }));
  }
  
  return checkins;
}