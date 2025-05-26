import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendHealthService } from '../data-access/backend-health.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // ✅ Safe lazy injection inside a method
  private backendHealthService = inject(BackendHealthService);

  handleError(error: unknown): void {
    if (
      error instanceof HttpErrorResponse &&
      (error.status === 0 || error.status === 503)
    ) {
      this.backendHealthService.setBackendUnavailable();
    }

    console.error('Error occurred:', error);
  }
}
