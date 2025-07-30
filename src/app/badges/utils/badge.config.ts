// /badges/utils/badge.config.ts
import type { CheckIn } from '@check-in/utils/check-in.models';
import type { Badge } from './badge.model';

export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'first-checkin',
    name: 'First Check-In',
    description: 'Your very first pub check-in!',
    iconUrl: '/assets/badges/first-checkin.svg',
    emoji: '🥇',
  },
  {
    id: 'early-riser',
    name: 'Early Riser',
    description: 'Checked in before 10am.',
    iconUrl: '/assets/badges/early-riser.svg',
    emoji: '🌅',
  },
  {
    id: 'hat-trick',
    name: 'Hat-Trick',
    description: 'Three check-ins in one day.',
    iconUrl: '/assets/badges/hat-trick.svg',
    emoji: '🥉',
  },
];

// ✨ Evaluation logic (pure functions)
// Signature: (newCheckin, allUserCheckins) => boolean
export const BADGE_RULES: Record<string, (checkin: CheckIn, allCheckins: CheckIn[]) => boolean> = {
  'first-checkin': (_checkin, all) => all.length === 1,
  'early-riser': checkin => new Date(checkin.timestamp.toDate()).getHours() < 10,
  'hat-trick': (_checkin, all) => {
    const today = new Date().toDateString();
    const todayCheckins = all.filter(c => new Date(c.timestamp.toDate()).toDateString() === today);
    return todayCheckins.length === 3;
  },
};
