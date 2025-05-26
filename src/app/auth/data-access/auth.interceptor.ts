import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from '../../shared/data-access/cookie.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const token = cookieService.getCookie('authToken');

  // console.log('🛰️ Interceptor hit:', req.url);

  if (req.url.includes('/auth/local')) {
    console.log('🔓 Skipping auth header for login route');
    return next(req);
  }

  if (token && token !== 'null') {
    // console.log('🔐 Attaching token:', token);
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    // console.log('➡️ Final request URL:', req.urlWithParams);
    // console.log('➡️ Final headers:', req.headers);
  } else {
    // console.log('🚫 No token attached for request:', req.url);
  }

  return next(req);
};
