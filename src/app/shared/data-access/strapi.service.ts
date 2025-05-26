/**
 * ❗️DirectStrapiService
 *
 * This service exists **only** for direct, uncached calls to Strapi.
 *
 * 🔐 Use this for:
 * - Auth endpoints (e.g. login, register)
 * - Admin-only tools
 * - Low-level access in emergencies
 *
 * 🚫 Do not use this for content fetching like events, pages, or navigation.
 * Use your cached backend routes instead (e.g. GET /api/events).
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class DirectStrapiService {
  protected http = inject(HttpClient);
  protected baseUrl = environment.strapiUrl;
  protected notificationService = inject(NotificationService);

  protected get<T>(
    endpoint: string,
    options?: { params?: any; headers?: any }
  ): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/api/${endpoint}`, options)
      .pipe(
        catchError((error) => {
          console.error('StrapiService error:', error);

          const message = error instanceof HttpErrorResponse
            ? `Server error: ${error.status} - ${error.statusText}`
            : 'An unknown error occurred';

          this.notificationService.error(message);

          return of([] as T);
        })
      );
  }

  protected post<T>(
    endpoint: string,
    body: any,
    options?: { params?: any; headers?: any }
  ): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}/api/${endpoint}`, body, options)
      .pipe(
        catchError((error) => {
          console.error('StrapiService error here:', error);

          this.notificationService.error('An unknown error occurred');

          const message = error instanceof HttpErrorResponse
            ? `Server error: ${error.status} - ${error.statusText}`
            : 'An unknown error occurred';

          return throwError(() => new Error(message));
        })
      );
  }

  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: ${error.status} - ${error.statusText}`;

      if (error.error?.message) {
        errorMessage += ` - ${error.error.message}`;
      }
    }

    console.error('StrapiService error:', errorMessage, error);

    return throwError(() => new Error(errorMessage));
  }

  ping(): Observable<boolean> {
    return this.http.get(`${this.baseUrl}/api/users-permissions/roles`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
