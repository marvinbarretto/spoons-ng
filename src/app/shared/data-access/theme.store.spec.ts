import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeStore } from './theme.store';
import { CookieService, SsrPlatformService } from '@fourfold/angular-foundation';
import { USER_THEME_TOKEN } from '../../../libs/tokens/user-theme.token';
import { defaultTheme, themes } from '../utils/theme.tokens';

// Mock services
class MockCookieService {
  getCookie(key: string): string | undefined {
    return undefined;
  }
  setCookie(key: string, value: string): void {}
}

class MockSsrPlatformService {
  isBrowser = true;
  onlyOnBrowser(fn: () => void): void {
    if (this.isBrowser) {
      fn();
    }
  }
  getDocument(): Document | undefined {
    return document;
  }
}

describe('ThemeStore', () => {
  let store: ThemeStore;
  let cookieService: MockCookieService;
  let ssrPlatformService: MockSsrPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeStore,
        { provide: CookieService, useClass: MockCookieService },
        { provide: SsrPlatformService, useClass: MockSsrPlatformService },
        { provide: USER_THEME_TOKEN, useValue: null },
      ],
    });

    store = TestBed.inject(ThemeStore);
    cookieService = TestBed.inject(CookieService) as unknown as MockCookieService;
    ssrPlatformService = TestBed.inject(SsrPlatformService) as unknown as MockSsrPlatformService;
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should initialize with default theme when no cookie or system preference', () => {
      // Prevent system preference from overriding default theme
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeStore,
          { provide: CookieService, useClass: MockCookieService },
          { provide: SsrPlatformService, useClass: MockSsrPlatformService },
          { provide: USER_THEME_TOKEN, useValue: null },
        ],
      });
      store = TestBed.inject(ThemeStore);

      expect(store.themeType()).toBe(defaultTheme.type);
      expect(store.theme()).toEqual(themes[defaultTheme.type]);
    });

    it('should initialize with server theme when no cookie or system preference', () => {
      // Prevent system preference from overriding server theme
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeStore,
          { provide: CookieService, useClass: MockCookieService },
          { provide: SsrPlatformService, useClass: MockSsrPlatformService },
          { provide: USER_THEME_TOKEN, useValue: 'midnight' },
        ],
      });
      store = TestBed.inject(ThemeStore);
      expect(store.themeType()).toBe('midnight');
    });
  });

  describe('setTheme', () => {
    it('should set the theme type and update the theme', () => {
      store.setTheme('coral');
      expect(store.themeType()).toBe('coral');
      expect(store.theme()).toEqual(themes['coral']);
    });

    it('should not set an unknown theme', () => {
      const currentTheme = store.themeType();
      store.setTheme('unknown-theme' as any);
      expect(store.themeType()).toBe(currentTheme);
    });

    it('should set a cookie with the new theme', () => {
      const setCookieSpy = vi.spyOn(cookieService, 'setCookie');
      store.setTheme('forest');
      expect(setCookieSpy).toHaveBeenCalledWith('theme', 'forest');
    });
  });

  describe('toggleTheme', () => {
    it('should switch from a light theme to a dark theme', () => {
      store.setTheme('fresh'); // a light theme
      store.toggleTheme();
      expect(store.isDark()).toBe(true);
    });

    it('should switch from a dark theme to a light theme', () => {
      store.setTheme('midnight'); // a dark theme
      store.toggleTheme();
      expect(store.isDark()).toBe(false);
    });
  });

  describe('Theme Getters', () => {
    it('should return all light themes', () => {
      const lightThemes = store.getLightThemes();
      expect(lightThemes.every(t => !t.theme.isDark)).toBe(true);
    });

    it('should return all dark themes', () => {
      const darkThemes = store.getDarkThemes();
      expect(darkThemes.every(t => t.theme.isDark)).toBe(true);
    });

    it('should return all themes', () => {
      const allThemes = store.getAllThemes();
      expect(allThemes.length).toBe(Object.keys(themes).length);
    });
  });

  describe('CSS Variables and DOM', () => {
    it('should return a map of CSS variables', () => {
      const variables = store.getCSSVariables();
      expect(variables['--primary']).toBe(store.theme().colors.primary);
      expect(variables['--background']).toBe(store.theme().colors.background);
    });

    // TODO: Fix this test. It fails with a "ProxyZone" error when using fakeAsync with vitest.
    // it('should apply theme to DOM', fakeAsync(() => {
    //   const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');
    //   const classListAddSpy = vi.spyOn(document.documentElement.classList, 'add');
    //   const classListRemoveSpy = vi.spyOn(document.documentElement.classList, 'remove');
    //   store.setTheme('forest');
    //   flush();
    //   expect(setPropertySpy).toHaveBeenCalledWith('--primary', themes['forest'].colors.primary);
    //   expect(classListRemoveSpy).toHaveBeenCalled();
    //   expect(classListAddSpy).toHaveBeenCalledWith('theme--forest');
    //   expect(classListAddSpy).toHaveBeenCalledWith('dark');
    // }));
  });

  describe('Browser Initialization', () => {
    it('should load theme from cookie if available', () => {
      vi.spyOn(cookieService, 'getCookie').mockReturnValue('coral');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeStore,
          { provide: CookieService, useValue: cookieService },
          { provide: SsrPlatformService, useClass: MockSsrPlatformService },
          { provide: USER_THEME_TOKEN, useValue: null },
        ],
      });
      store = TestBed.inject(ThemeStore);
      expect(store.themeType()).toBe('coral');
    });

    it('should respect system preference for dark mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
        })),
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeStore,
          { provide: CookieService, useClass: MockCookieService },
          { provide: SsrPlatformService, useClass: MockSsrPlatformService },
          { provide: USER_THEME_TOKEN, useValue: null },
        ],
      });
      store = TestBed.inject(ThemeStore);
      expect(store.isDark()).toBe(true);
    });
  });
});
