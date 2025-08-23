import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { tap } from 'rxjs/operators';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in using the auth service's state
  const isAuthenticated = authService.isLoggedIn();

  if (!isAuthenticated) {
    console.log('Access denied: User not authenticated');
    router.navigate(['/login']);
    return false;
  }

  // Verify token on each guard check
  authService.isAuthenticated$
    .pipe(
      tap((isValid) => {
        if (!isValid) {
          console.log('Access denied: Invalid or expired token');
          router.navigate(['/login']);
        }
      })
    )
    .subscribe();

  return true;
};
