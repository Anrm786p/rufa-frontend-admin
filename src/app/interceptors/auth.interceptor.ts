import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // Get the current URL path
  const isLoginRequest = req.url.includes('/login');
  const isPublicEndpoint = req.url.includes('/public');

  // Skip token attachment for login and public endpoints
  if (isLoginRequest || isPublicEndpoint) {
    console.log('Skipping auth token for:', req.url);
    return next(req);
  }

  console.log(
    'Request body type:',
    req.body instanceof FormData ? 'FormData' : typeof req.body
  );
  console.log(
    'Original headers:',
    JSON.stringify(
      [...req.headers.keys()].map((key) => `${key}: ${req.headers.get(key)}`)
    )
  );

  const token = authService.getToken();
  console.log(
    'Current token:',
    token ? token.substring(0, 10) + '...' : 'Missing'
  );

  // Handle missing token for protected routes
  if (!token) {
    console.error('No auth token found for protected route:', req.url);
    router.navigate(['/login']);
    return throwError(() => new Error('Authentication required'));
  }

  // Clone the request with token, preserving existing headers
  let clonedReq = req.clone();

  // Always add Authorization header
  clonedReq = clonedReq.clone({
    headers: clonedReq.headers.set('Authorization', `Bearer ${token}`),
  });

  // Add Content-Type only for non-FormData requests
  if (!(req.body instanceof FormData)) {
    clonedReq = clonedReq.clone({
      headers: clonedReq.headers.set('Content-Type', 'application/json'),
    });
  }
  console.log(
    'Modified headers:',
    JSON.stringify(
      [...clonedReq.headers.keys()].map(
        (key) => `${key}: ${clonedReq.headers.get(key)}`
      )
    )
  );

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle authentication errors
      if (error.status === 401) {
        console.error(
          'Authentication token expired or invalid:',
          error.error?.message
        );
        authService.logout();
        return throwError(
          () => new Error('Session expired. Please login again.')
        );
      }

      // Handle authorization errors
      if (error.status === 403) {
        console.error(
          'Authorization error - Access denied:',
          error.error?.message
        );
        return throwError(
          () => new Error('You do not have permission to access this resource.')
        );
      }

      // Handle other errors
      return throwError(() => error);
    })
  );
};
