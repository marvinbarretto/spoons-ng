import { vi } from 'vitest';
import { FeatureFlagService } from '../data-access/feature-flag.service';
import { FeatureFlagPipe } from './feature-flag.pipe';

describe('FeatureFlagPipe', () => {
  let pipe: FeatureFlagPipe;
  let mockFeatureFlagService: vi.Mocked<FeatureFlagService>;

  beforeEach(() => {
    // TODO: Centralise mocked services
    mockFeatureFlagService = {
      isEnabled: vi.fn(),
    } as unknown as vi.Mocked<FeatureFlagService>;

    pipe = new FeatureFlagPipe(mockFeatureFlagService);
  });

  it('should return true when the feature is enabled', () => {
    mockFeatureFlagService.isEnabled.mockReturnValue(true);

    const result = pipe.transform('accessibility');

    expect(result).toBe(true);
    expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('accessibility');
  });

  it('should return false when the feature is disabled', () => {
    mockFeatureFlagService.isEnabled.mockReturnValue(false);

    const result = pipe.transform('accessibility');

    expect(result).toBe(false);
    expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith('accessibility');
  });
});
