import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000'; // JSON Server URL

  constructor(private http: HttpClient) {}

  /**
   * Get all users
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      catchError(error => throwError(() => new Error(`Failed to fetch users: ${error.message}`)))
    );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number | string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      catchError(error => throwError(() => new Error(`User with id ${id} not found`)))
    );
  }
} 