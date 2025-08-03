import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../../shared/interfaces/user.interface';
import { LoginCredentials } from '../../shared/interfaces/auth.interface';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  /**
   * Login user with email and password
   * @param credentials User login credentials
   * @returns Observable with user data or error
   */
  login(credentials: LoginCredentials): Observable<User> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      map(users => {
        const user = users.find(
          u => u.email === credentials.email && u.password === credentials.password
        );
        
        if (user) {
          // Store user in localStorage
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          return user;
        } else {
          throw new Error('Invalid email or password');
        }
      }),
      catchError(error => {
        return throwError(() => new Error('Invalid email or password'));
      })
    );
  }

  /**
   * Get all users (for admin dashboard)
   * @returns Observable with all users
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  /**
   * Get user by ID
   * @param id User ID
   * @returns Observable with user data
   */
  getUserById(id: number | string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }


  /**
   * Update user
   * @param id User ID
   * @param user User data
   * @returns Observable with updated user
   */
  updateUser(id: number | string, user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}`, user);
  }

  /**
   * Delete user
   * @param id User ID
   * @returns Observable
   */
  deleteUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  /**
   * Get the current logged in user
   * @returns The current user or null if not logged in
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is logged in
   * @returns True if user is logged in, false otherwise
   */
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Check if current user is an admin
   * @returns True if user is admin, false otherwise
   */
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.role === 'admin';
  }
}