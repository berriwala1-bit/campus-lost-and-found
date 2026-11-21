import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly USERS_URL = `${environment.apiUrl}/users`;

  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly token = signal<string | null>(localStorage.getItem('token'));

  readonly isLoggedIn = computed(() => !!this.token() && !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    // Si token présent, actualiser les infos utilisateur en arrière-plan
    if (this.token()) {
      this.refreshProfile().subscribe({
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.clearSession();
          }
        }
      });
    }
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login.php`, credentials).pipe(
      tap(res => {
        if (res.success && res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  register(data: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    telephone?: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register.php`, data).pipe(
      tap(res => {
        if (res.success && res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  refreshProfile(): Observable<{ success: boolean; user: User }> {
    return this.http.get<{ success: boolean; user: User }>(`${this.API_URL}/me.php`).pipe(
      tap(res => {
        if (res.success && res.user) {
          this.currentUser.set(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('role', res.user.role);
        }
      })
    );
  }

  getProfileWithStats(): Observable<{ success: boolean; user: User; stats: { objets_publies: number; reclamations_creees: number } }> {
    return this.http.get<{ success: boolean; user: User; stats: any }>(`${this.USERS_URL}/profile.php`);
  }

  updateProfile(data: { nom: string; prenom: string; telephone?: string; current_password?: string; new_password?: string }): Observable<{ success: boolean; message: string; user: User }> {
    return this.http.put<{ success: boolean; message: string; user: User }>(`${this.USERS_URL}/profile.php`, data).pipe(
      tap(res => {
        if (res.success && res.user) {
          this.currentUser.set(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('role', res.user.role);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.API_URL}/logout.php`, {}).subscribe({
      next: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect()
    });
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('role', user.role);
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  }

  private clearSessionAndRedirect(): void {
    this.clearSession();
    this.router.navigate(['/connexion']);
  }

  getPhotoUrl(photoPath?: string | null): string {
    if (!photoPath) return '';
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    return `${environment.uploadUrl}/${photoPath}`;
  }
}
