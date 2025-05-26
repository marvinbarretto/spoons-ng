// auth.interceptor.spec.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const callInterceptor = (req: HttpRequest<any>, token: string | null) =>
    TestBed.runInInjectionContext(() => {
      const next: HttpHandlerFn = (nextReq) => {
        return of({ nextReq } as unknown as HttpEvent<any>);
      };

      // Mock environment + localStorage
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(() => token),
        },
        writable: true,
      });

      return authInterceptor(req, next);
    });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  it('should attach Authorization header if token exists', (done) => {
    const dummyRequest = new HttpRequest(
      'GET',
      'http://localhost:1337/api/pages'
    );

    callInterceptor(dummyRequest, 'MOCK_TOKEN').subscribe((res: any) => {
      expect(res.nextReq.headers.get('Authorization')).toBe(
        'Bearer MOCK_TOKEN'
      );
      done();
    });
  });

  it('should not attach Authorization header if token is null', (done) => {
    const dummyRequest = new HttpRequest(
      'GET',
      'http://localhost:1337/api/pages'
    );

    callInterceptor(dummyRequest, null).subscribe((res: any) => {
      expect(res.nextReq.headers.has('Authorization')).toBe(false);
      done();
    });
  });
});
