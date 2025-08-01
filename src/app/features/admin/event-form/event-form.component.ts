import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../shared/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Event } from '../../../shared/interfaces/event.interface';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  eventForm: FormGroup;
  isEditMode = false;
  eventId: number | string | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.eventForm = this.createEventForm();
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        // Use the ID as-is (could be string or number)
        this.eventId = params['id'];
        
        // Check if the ID is valid (not empty)
        if (!this.eventId || this.eventId === '') {
          this.errorMessage = 'Invalid event ID';
          return;
        }
        
        this.loadEvent(this.eventId);
      }
    });
  }

  /**
   * Create event form with validators
   * @returns FormGroup
   */
  createEventForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      date: ['', Validators.required],
      time: ['', Validators.required],
      location: ['', Validators.required],
      type: ['Webinar', Validators.required],
      capacity: [50, [Validators.required, Validators.min(1)]]
    });
  }

  /**
   * Load event data for editing
   * @param id Event ID (can be string or number)
   */
  loadEvent(id: number | string): void {
    this.isLoading = true;
    this.errorMessage = ''; // Clear any previous errors
    
    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.eventForm.patchValue({
          title: event.title || '',
          description: event.description || '',
          date: event.date || '',
          time: event.time || '',
          location: event.location || '',
          type: event.type || 'Webinar',
          capacity: event.capacity || 50
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Failed to load event: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  /**
   * Submit the form to create or update an event
   */
  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.markFormGroupTouched(this.eventForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMessage = 'You must be logged in to create an event';
      this.isLoading = false;
      return;
    }

    const eventData = {
      ...this.eventForm.value,
      createdBy: currentUser.id
    };

    if (this.isEditMode && this.eventId) {
      // Update existing event
      this.eventService.updateEvent(this.eventId, eventData).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/admin/dashboard']); // Navigate to dashboard instead of events
        },
        error: (error) => {
          this.errorMessage = `Failed to update event: ${error.message}`;
          this.isLoading = false;
        }
      });
    } else {
      // Create new event
      this.eventService.createEvent(eventData).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/admin/dashboard']); // Navigate to dashboard instead of events
        },
        error: (error) => {
          this.errorMessage = `Failed to create event: ${error.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Mark all controls in form group as touched to trigger validation
   * @param formGroup Form group to mark as touched
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}