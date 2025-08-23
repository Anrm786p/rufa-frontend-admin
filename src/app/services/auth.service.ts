import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

interface LoginResponse {
  name: string;
  role: string;
  email: string;
  token: string;
}

interface UserInfo {
  name: string;
  role: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/users`;
  private tokenKey = 'token';
  private userInfoKey = 'userInfo';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(
    this.getUserInfo()
  );

  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  userInfo$ = this.userInfoSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Check authentication status on service initialization
    this.checkAuthStatus();
    console.log(
      'AuthService initialized, token:',
      this.getToken() ? 'present' : 'missing'
    );
  }

  private checkAuthStatus(): void {
    const token = this.getToken();
    const userInfo = this.getUserInfo();

    // If we have both token and user info, consider the user authenticated
    if (token && userInfo) {
      this.isAuthenticatedSubject.next(true);
      this.userInfoSubject.next(userInfo);
    } else {
      this.isAuthenticatedSubject.next(false);
      this.userInfoSubject.next(null);
    }
  }

  login(credentials: {
    email: string;
    password: string;
  }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          console.log('Login response received');
          if (response && response.token) {
            console.log('Setting session with valid response');
            this.setSession(response);
          } else {
            console.error('Invalid login response:', response);
            throw new Error('Invalid login response');
          }
        }),
        catchError((error) => {
          console.error('Login error:', error);
          this.clearStorage();
          throw error;
        })
      );
  }

  private setSession(response: LoginResponse): void {
    console.log('Setting session with response:', response); // Debug log

    if (!response) {
      console.error('Empty response in setSession');
      return;
    }

    // Store token
    if (response.token) {
      localStorage.setItem(this.tokenKey, response.token);
    } else {
      console.error('No token in response');
      return;
    }

    // Store user info
    if (response.name && response.role && response.email) {
      const userInfo: UserInfo = {
        name: response.name,
        role: response.role,
        email: response.email,
      };

      console.log('Storing user info:', userInfo); // Debug log
      localStorage.setItem(this.userInfoKey, JSON.stringify(userInfo));
      this.userInfoSubject.next(userInfo);
    } else {
      console.error('Missing user info in response');
      return;
    }

    this.isAuthenticatedSubject.next(true);
  }

  private clearStorage(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userInfoKey);
    this.userInfoSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getUserInfo(): UserInfo | null {
    const userInfoStr = localStorage.getItem(this.userInfoKey);
    if (userInfoStr) {
      try {
        return JSON.parse(userInfoStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  isAdmin(): boolean {
    const userInfo = this.getUserInfo();
    return userInfo?.role === 'admin';
  }

  logout(): void {
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
