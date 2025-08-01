import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { Event } from '../interfaces/event.interface';
import { EventParticipation } from '../interfaces/event-participation.interface';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'http://localhost:3000'; // JSON Server URL
  
  constructor(private http: HttpClient) {}

  /**
   * Get all events
   * @returns Observable of events array
   */
  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/events`).pipe(
      catchError(this.handleError<Event[]>('getEvents', []))
    );
  }

  /**
   * Get event by ID
   * @param id Event ID
   * @returns Observable of event
   */
  getEventById(id: number | string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/events/${id}`).pipe(
      catchError(error => throwError(() => new Error(`Event with id ${id} not found`)))
    );
  }

  /**
   * Create a new event
   * @param event Event data (without ID - will be auto-generated)
   * @returns Observable of created event
   */
  createEvent(event: Omit<Event, 'id'>): Observable<Event> {
    return this.http.post<Event>(`${this.apiUrl}/events`, event).pipe(
      catchError(error => throwError(() => new Error(`Failed to create event: ${error.message}`)))
    );
  }

  /**
   * Update an existing event
   * @param id Event ID
   * @param event Updated event data
   * @returns Observable of updated event
   */
  updateEvent(id: number | string, event: Partial<Event>): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}/events/${id}`, event).pipe(
      catchError(error => throwError(() => new Error(`Failed to update event: ${error.message}`)))
    );
  }

  /**
   * Delete an event
   * @param id Event ID
   * @returns Observable of deleted event ID
   */
  deleteEvent(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/events/${id}`).pipe(
      tap(() => {
        console.log(`Deleted event with id ${id}`);
        // Clean up orphaned participations after event deletion
        this.cleanupOrphanedParticipations(id);
      }),
      catchError(error => throwError(() => new Error(`Failed to delete event: ${error.message}`)))
    );
  }

  /**
   * Clean up orphaned participations for a deleted event
   * @param eventId The ID of the deleted event
   */
  private cleanupOrphanedParticipations(eventId: number | string): void {
    // Get all participations
    this.getParticipations().subscribe({
      next: (participations) => {
        // Find participations that reference the deleted event
        const orphanedParticipations = participations.filter(p => p.eventId === eventId);
        
        if (orphanedParticipations.length > 0) {
          console.log(`Found ${orphanedParticipations.length} orphaned participations to clean up for event ${eventId}`);
          
          // Delete each orphaned participation
          orphanedParticipations.forEach(participation => {
            this.deleteParticipation(participation.id).subscribe({
              next: () => console.log(`Deleted orphaned participation ${participation.id} for event ${eventId}`),
              error: (error) => console.error(`Failed to delete orphaned participation ${participation.id}:`, error)
            });
          });
        }
      },
      error: (error) => console.error('Error getting participations for cleanup:', error)
    });
  }

  /**
   * Clean up all existing orphaned participations (null eventId or non-existent events)
   */
  cleanupAllOrphanedParticipations(): void {
    // Get all participations and events
    forkJoin({
      participations: this.getParticipations(),
      events: this.getEvents()
    }).subscribe({
      next: ({ participations, events }) => {
        // Find orphaned participations (null eventId or non-existent events)
        const orphanedParticipations = participations.filter(participation => {
          return !participation.eventId || 
                 participation.eventId === null || 
                 participation.eventId === undefined ||
                 !events.find(e => e.id === participation.eventId);
        });
        
        if (orphanedParticipations.length > 0) {
          console.log(`Found ${orphanedParticipations.length} orphaned participations to clean up`);
          
          orphanedParticipations.forEach(participation => {
            this.deleteParticipation(participation.id).subscribe({
              next: () => console.log(`Deleted orphaned participation ${participation.id} with eventId: ${participation.eventId}`),
              error: (error) => console.error(`Failed to delete orphaned participation ${participation.id}:`, error)
            });
          });
        } else {
          console.log('No orphaned participations found');
        }
      },
      error: (error) => console.error('Error cleaning up orphaned participations:', error)
    });
  }

  /**
   * Get all participations
   * @returns Observable of participations array
   */
  getParticipations(): Observable<EventParticipation[]> {
    return this.http.get<EventParticipation[]>(`${this.apiUrl}/participations`).pipe(
      catchError(this.handleError<EventParticipation[]>('getParticipations', []))
    );
  }

  /**
   * Get participations for a specific user
   * @param userId User ID
   * @returns Observable of user's participations
   */
  getUserParticipations(userId: number | string): Observable<EventParticipation[]> {
    const userIdStr = userId.toString();
    return this.http.get<EventParticipation[]>(`${this.apiUrl}/participations?userId=${userIdStr}`).pipe(
      catchError(this.handleError<EventParticipation[]>('getUserParticipations', []))
    );
  }

  /**
   * Get participation for a specific user and event
   * @param userId User ID
   * @param eventId Event ID
   * @returns Observable of participation
   */
  getParticipation(userId: number | string, eventId: number | string): Observable<EventParticipation> {
    const userIdStr = userId.toString();
    const eventIdStr = eventId.toString();
    
    return this.http.get<EventParticipation[]>(
      `${this.apiUrl}/participations?userId=${userIdStr}&eventId=${eventIdStr}`
    ).pipe(
      tap(participations => {
        if (participations.length === 0) {
          throw new Error('Participation not found');
        }
      }),
      catchError(error => throwError(() => new Error('Participation not found')))
    ) as Observable<any>;
  }

  /**
   * Register a user for an event
   * @param userId User ID
   * @param eventId Event ID
   * @returns Observable of created participation
   */
  registerForEvent(userId: number, eventId: number): Observable<EventParticipation> {
    const newParticipation: Omit<EventParticipation, 'id'> = {
      userId,
      eventId,
      status: 'Registered',
      attendance: null, // Default attendance status
      registrationDate: new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
    };
    
    return this.http.post<EventParticipation>(`${this.apiUrl}/participations`, newParticipation).pipe(
      catchError(error => throwError(() => new Error(`Failed to register for event: ${error.message}`)))
    );
  }

  /**
   * Create a new participation
   * @param participation Participation data
   * @returns Observable of created participation
   */
  createParticipation(participation: EventParticipation): Observable<EventParticipation> {
    const newParticipation: Omit<EventParticipation, 'id'> = {
      userId: participation.userId,
      eventId: participation.eventId,
      status: participation.status,
      attendance: participation.attendance,
      registrationDate: participation.registrationDate
    };
    return this.http.post<EventParticipation>(`${this.apiUrl}/participations`, newParticipation).pipe(
      catchError(error => throwError(() => new Error(`Failed to create participation: ${error.message}`)))
    );
  }

  /**
   * Update participation status
   * @param userId User ID
   * @param eventId Event ID
   * @param status New status
   * @returns Observable of updated participation
   */
  updateParticipationStatus(
    userId: number | string, 
    eventId: number | string, 
    status: 'Assigned' | 'Pending' | 'Registered'
  ): Observable<EventParticipation> {
    // Convert to strings to match database format
    const userIdStr = userId.toString();
    const eventIdStr = eventId.toString();
    
    // If status is changing to Assigned or Pending, clear attendance
    const shouldClearAttendance = status === 'Assigned' || status === 'Pending';
    const updateData = shouldClearAttendance ? { status, attendance: null } : { status };
    
    // First get the participation ID
    return this.http.get<EventParticipation[]>(
      `${this.apiUrl}/participations?userId=${userIdStr}&eventId=${eventIdStr}`
    ).pipe(
      switchMap(participations => {
        if (participations.length === 0) {
          throw new Error('Participation not found');
        }
        const participationId = participations[0].id;
        return this.http.patch<EventParticipation>(
          `${this.apiUrl}/participations/${participationId}`,
          updateData
        );
      }),
      catchError(error => throwError(() => new Error('Participation not found')))
    );
  }

  /**
   * Update participation attendance
   * @param userId User ID
   * @param eventId Event ID
   * @param attendance New attendance status
   * @returns Observable of updated participation
   */
  updateParticipationAttendance(
    userId: number | string, 
    eventId: number | string, 
    attendance: 'Attended' | 'Completed'
  ): Observable<EventParticipation> {
    // Convert to strings to match database format
    const userIdStr = userId.toString();
    const eventIdStr = eventId.toString();
    
    // First get the participation ID
    return this.http.get<EventParticipation[]>(
      `${this.apiUrl}/participations?userId=${userIdStr}&eventId=${eventIdStr}`
    ).pipe(
      switchMap(participations => {
        if (participations.length === 0) {
          throw new Error('Participation not found');
        }
        const participationId = participations[0].id;
        return this.http.patch<EventParticipation>(
          `${this.apiUrl}/participations/${participationId}`,
          { attendance }
        );
      }),
      catchError(error => throwError(() => new Error('Participation not found')))
    );
  }

  /**
   * Delete a participation
   * @param id Participation ID
   * @returns Observable of deleted participation
   */
  deleteParticipation(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/participations/${id}`).pipe(
      tap(() => console.log(`Deleted participation with id ${id}`)),
      catchError(error => throwError(() => new Error(`Failed to delete participation: ${error.message}`)))
    );
  }

  /**
   * Handle HTTP operation that failed
   * @param operation Name of the operation that failed
   * @param result Optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return throwError(() => new Error(`${operation} failed: ${error.message}`));
    };
  }
}