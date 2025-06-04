import { TestBed } from '@angular/core/testing';

import { BadgeEvaluatorService } from './badge-evaluator.service';
import { Badge } from '../utils/badge.model';
import { CheckIn } from '../../check-in/util/check-in.model';
import { Timestamp } from 'firebase/firestore';

describe('BadgeEvaluatorService', () => {
  let service: BadgeEvaluatorService;
  let mockAwarded: string[] = [];

  // TODO: Move this out somewhere?
  const mockBadgeStore = {
    hasItem: jest.fn((predicate: (b: Badge) => boolean) =>
      mockAwarded.some(id => predicate({ id } as Badge))
    ),
    award: jest.fn((badge: Badge) => {
      mockAwarded.push(badge.id);
    }),
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BadgeEvaluatorService);

    mockAwarded = [];
    // service = new BadgeEvaluatorService(mockBadgeStore as any)

  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  const createCheckin = (hour: number, overrides: Partial<CheckIn> = {}): CheckIn => ({
    id: 'c1',
    userId: 'u1',
    pubId: 'p1',
    timestamp: new Date(2024, 5, 1, hour, 0) as any,
    dateKey: '2024-06-01',
    ...overrides,
  });

  it('awards first-checkin badge on first ever check-in', async () => {
    const checkin = createCheckin(12);
    await service.evaluate(checkin, [checkin]);

    expect(mockBadgeStore.award).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'first-checkin' })
    );
  });

  it('awards early-riser badge for check-in before 10am', async () => {
    const checkin = createCheckin(8);
    await service.evaluate(checkin, [checkin]);

    expect(mockBadgeStore.award).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'early-riser' })
    );
  });

  it('does not award early-riser for check-in after 10am', async () => {
    const checkin = createCheckin(11);
    await service.evaluate(checkin, [checkin]);

    expect(mockBadgeStore.award).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'early-riser' })
    );
  });

  it('awards hat-trick badge on third check-in of the day', async () => {
    const date = new Date();
    const checkins = [
      createCheckin(12, { id: 'c1', timestamp: Timestamp.fromDate(date) }),
      createCheckin(14, { id: 'c2', timestamp: Timestamp.fromDate(date) }),
      createCheckin(16, { id: 'c3', timestamp: Timestamp.fromDate(date) }),
    ];
    await service.evaluate(checkins[2], checkins);

    expect(mockBadgeStore.award).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hat-trick' })
    );
  });

  it('does not award the same badge twice', async () => {
    mockAwarded = ['first-checkin'];
    const checkin = createCheckin(12);
    await service.evaluate(checkin, [checkin]);

    expect(mockBadgeStore.award).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'first-checkin' })
    );
  });
});
