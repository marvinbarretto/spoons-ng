import { TestBed } from '@angular/core/testing';
import { FeatureFlagService } from './feature-flag.service';
import { environment } from '../../../environments/environment';

// Define a type for feature flags for easier mocking
type FeatureFlags = Record<string, boolean>;

// TODO: Where should I be storing these mocks?
// Mock the environment
jest.mock('../../../environments/environment', () => ({
  __esModule: true, // Mark as ES Module
  environment: {
    production: false,
    enableAllFeaturesForDev: false,
    featureFlags: {} as FeatureFlags,
  },
}));

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;


  // Helper function to set environment properties for a test
  const setEnvironment = (prod: boolean, enableAll: boolean, flags: FeatureFlags) => {
    Object.defineProperty(environment, 'production', { value: prod, configurable: true });
    Object.defineProperty(environment, 'enableAllFeaturesForDev', { value: enableAll, configurable: true });
    Object.defineProperty(environment, 'featureFlags', { value: flags, configurable: true });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeatureFlagService]
    });
    service = TestBed.inject(FeatureFlagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Standard Flag Checks (production=true, enableAllFeaturesForDev=false)', () => {
    beforeEach(() => {
      setEnvironment(true, false, { existingFlagTrue: true, existingFlagFalse: false });
    });

    it('1. should return true when a flag is true in environment.featureFlags', () => {
      expect(service.isEnabled('existingFlagTrue')).toBe(true);
    });

    it('2. should return false when a flag is false in environment.featureFlags', () => {
      expect(service.isEnabled('existingFlagFalse')).toBe(false);
    });

    it('3. should return false for a flag that is not defined in environment.featureFlags', () => {
      expect(service.isEnabled('nonExistingFlag')).toBe(false);
    });
  });

  describe('Development Mode: enableAllFeaturesForDev is true (production=false)', () => {
    beforeEach(() => {
      setEnvironment(false, true, { devFlagFalse: false });
    });

    it('4.1. should return true even if the specific flag is false in environment.featureFlags', () => {
      expect(service.isEnabled('devFlagFalse')).toBe(true);
    });

    it('4.2. should return true even if the specific flag is not defined in environment.featureFlags', () => {
      expect(service.isEnabled('anotherNonExistingFlag')).toBe(true);
    });
  });

  describe('Production Mode with enableAllFeaturesForDev is true (SHOULD IGNORE enableAllFeaturesForDev)', () => {
    beforeEach(() => {
      setEnvironment(true, true, { prodFlagTrue: true, prodFlagFalse: false });
    });

    it('5.1. should return false if the specific flag is false in environment.featureFlags', () => {
      expect(service.isEnabled('prodFlagFalse')).toBe(false);
    });

    it('5.2. should return true if the specific flag is true in environment.featureFlags', () => {
      expect(service.isEnabled('prodFlagTrue')).toBe(true);
    });

    it('5.3. should return false if the specific flag is not defined', () => {
      expect(service.isEnabled('yetAnotherNonExistingFlag')).toBe(false);
    });
  });

  describe('Development Mode: enableAllFeaturesForDev is false (production=false)', () => {
    beforeEach(() => {
      setEnvironment(false, false, { devFlagTrueFalseScenario: true, devFlagFalseFalseScenario: false });
    });

    it('6.1. should return false if the specific flag is false in environment.featureFlags', () => {
      expect(service.isEnabled('devFlagFalseFalseScenario')).toBe(false);
    });

    it('6.2. should return true if the specific flag is true in environment.featureFlags', () => {
      expect(service.isEnabled('devFlagTrueFalseScenario')).toBe(true);
    });

    it('6.3. should return false if the specific flag is not defined', () => {
      expect(service.isEnabled('lastNonExistingFlag')).toBe(false);
    });
  });
});
