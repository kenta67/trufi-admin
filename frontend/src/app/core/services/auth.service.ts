import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'administrador' | 'operador' | 'tecnico';
  avatar_url?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadSession();
  }

  private loadSession(): void {
    const userData = localStorage.getItem('trufi_user');
    const token = localStorage.getItem('trufi_token');
    if (userData && token) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem('trufi_token', response.session.access_token);
          localStorage.setItem('trufi_refresh', response.session.refresh_token);
          localStorage.setItem('trufi_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    }
    localStorage.removeItem('trufi_token');
    localStorage.removeItem('trufi_refresh');
    localStorage.removeItem('trufi_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('trufi_token');
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'administrador';
  }

  get isOperator(): boolean {
    return this.currentUser?.role === 'operador';
  }

  get isTechnician(): boolean {
    return this.currentUser?.role === 'tecnico';
  }

  hasRole(...roles: string[]): boolean {
    return !!this.currentUser && roles.includes(this.currentUser.role);
  }
}
