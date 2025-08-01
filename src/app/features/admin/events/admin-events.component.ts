import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../shared/services/event.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-events.component.html',
  styleUrls: ['./admin-events.component.scss']
})
export class AdminEventsComponent implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  paginatedEvents: Event[] = [];

  // Make Math available in template
  Math = Math;

  constructor(private eventService: EventService, private router: Router) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  /**
   * Load all events
   */
  loadEvents(): void {
    this.isLoading = true;
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.filteredEvents = events;
        this.calculatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Failed to load events: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  /**
   * Filter events based on search term
   */
  filterEvents(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEvents = this.events;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredEvents = this.events.filter(event => 
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term) ||
        event.type.toLowerCase().includes(term)
      );
    }
    
    // Reset to first page when filtering
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Delete an event
   * @param id Event ID (can be string or number)
   */
  deleteEvent(id: number | string): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.isLoading = true;
      this.eventService.deleteEvent(id).subscribe({
        next: () => {
          this.loadEvents();
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = `Failed to delete event: ${error.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Navigate to create event page
   */
  goToCreateEvent(): void {
    this.router.navigate(['/admin/events/create']);
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  /**
   * Calculate pagination for filtered events
   */
  private calculatePagination(): void {
    this.totalItems = this.filteredEvents.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    
    // Calculate start and end indices
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Get paginated events
    this.paginatedEvents = this.filteredEvents.slice(startIndex, endIndex);
  }

  /**
   * Go to specific page
   * @param page Page number
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  /**
   * Get array of page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      // Adjust start if end is at the limit
      if (end === this.totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Change page size
   * @param size New page size
   */
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.calculatePagination();
  }

  /**
   * Handle page size change from template
   * @param changeEvent Change event
   */
  onPageSizeChange(changeEvent: any): void {
    const target = changeEvent.target as HTMLSelectElement;
    if (target && target.value) {
      this.changePageSize(+target.value);
    }
  }
}