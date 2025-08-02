import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../shared/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ChartService } from '../../../shared/services/chart.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { EventParticipation } from '../../../shared/interfaces/event-participation.interface';
import { User } from '../../../shared/interfaces/user.interface';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('userStatsChart', { static: true }) userStatsChart!: ElementRef;
  @ViewChild('eventParticipationChart', { static: true }) eventParticipationChart!: ElementRef;

  currentUser: User | null = null;
  events: Event[] = [];
  participations: EventParticipation[] = [];
  users: User[] = [];
  filteredParticipations: EventParticipation[] = [];
  selectedFilter: string = 'all';
  searchTerm: string = '';
  
  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 5; // Changed from 10 to 5 to show pagination
  totalItems: number = 0;
  totalPages: number = 0;
  paginatedParticipations: EventParticipation[] = [];

  // Add these properties for the create event modal
  // Remove showCreateEventModal, newEvent, openCreateEventModal, closeCreateEventModal, createEvent and related modal logic

  private pollingInterval: any;
  eventTitleFilter: string | null = null;
  statusFilter: string | null = null;
  searchFilter: string | null = null;

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private chartService: ChartService
  ) {}

  /**
   * Initialize the component on startup
   * Sets up the current user, loads initial data, and starts polling for updates
   */
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadEvents();
    this.loadParticipations();
    this.loadUsers();
    this.pollingInterval = setInterval(() => {
      this.loadEvents();
      this.loadParticipations();
      this.loadUsers();
    }, 10000); // 10 seconds
  }

  /**
   * Clean up resources when component is destroyed
   * Clears the polling interval to prevent memory leaks
   */
  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  /**
   * Load all events
   */
  loadEvents(): void {
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
        // Render chart after events are loaded
        setTimeout(() => this.renderEventParticipationChart(), 100);
      },
      error: (error) => {
        console.error('Failed to load events:', error);
        this.events = [];
      }
    });
  }

  /**
   * Load all participations
   */
  loadParticipations(): void {
    this.eventService.getParticipations().subscribe({
      next: (participations) => {
        // Remove participations for deleted events
        this.participations = participations.filter(p => this.getEvent(p.eventId));
        // Re-apply search filter if set
        if (this.searchFilter && this.searchFilter.trim() !== '') {
          const term = this.searchFilter.toLowerCase().trim();
          this.filteredParticipations = this.participations.filter(p => {
            const event = this.getEvent(p.eventId);
            return event && event.title.toLowerCase().includes(term);
          });
        } else if (this.statusFilter && this.statusFilter !== 'all') {
          this.filteredParticipations = this.participations.filter(p => p.status === this.statusFilter);
          this.selectedFilter = this.statusFilter;
        } else if (this.eventTitleFilter) {
          this.filteredParticipations = this.participations.filter(p => {
            const ev = this.getEvent(p.eventId);
            return ev && ev.title === this.eventTitleFilter;
          });
          this.selectedFilter = this.eventTitleFilter;
        } else {
          this.filteredParticipations = this.participations;
        }
        
        // Calculate pagination
        this.calculatePagination();
        
        // Render chart after participations are loaded
        setTimeout(() => this.renderUserStatsChart(), 100);
      },
      error: (error) => {
        console.error('Failed to load participations:', error);
        this.participations = [];
        this.filteredParticipations = [];
        this.calculatePagination();
      }
    });
  }

  /**
   * Clean up orphaned participations for deleted events
   * Removes participations that reference non-existent events to maintain data integrity
   */
  cleanUpOrphanParticipations(): void {
    this.participations.forEach(participation => {
      if (!this.getEvent(participation.eventId)) {
        this.eventService.deleteParticipation(participation.id).subscribe({
          next: () => console.log(`Deleted orphan participation ${participation.id}`),
          error: (error) => console.error(`Failed to delete orphan participation ${participation.id}:`, error)
        });
      }
    });
  }

  /**
   * Load all users (now using AuthService as single source)
   */
  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        // Fallback to empty array if auth service fails
        this.users = [];
      }
    });
  }

  /**
   * Render the user statistics donut chart
   * Creates a donut chart showing the distribution of participation statuses
   * Only renders if there is meaningful data to display
   */
  renderUserStatsChart(): void {
    const statuses = ['Assigned', 'Pending', 'Registered', 'Attended', 'Completed'];
    const data = statuses.map(status => ({
      label: status,
      value: this.participations.filter(p => p.status === status).length
    }));

    // Only render if we have data
    if (data.some(d => d.value > 0)) {
      this.chartService.createDonutChart(
        this.userStatsChart,
        data,
        ['#4BC0C0', '#FF9F40', '#9966FF', '#36A2EB', '#FF6384'],
        (label: string) => this.filterParticipationsByStatus(label)
      );
    }
  }

  /**
   * Filter participations by status from chart click
   * Toggles the status filter - if already filtered by this status, resets to show all
   * @param status The status to filter by (Assigned, Pending, Registered, Attended, Completed)
   */
  filterParticipationsByStatus(status: string): void {
    // Toggle filter: if already filtered by this status, reset to all
    if (this.selectedFilter === status) {
      this.selectedFilter = 'all';
      this.filteredParticipations = this.participations;
      this.statusFilter = null;
    } else {
      this.selectedFilter = status;
      this.filteredParticipations = this.participations.filter(p => p.status === status);
      this.statusFilter = status;
      this.eventTitleFilter = null;
    }
    this.searchTerm = '';
    
    // Reset to first page and calculate pagination
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Render the event participation stacked bar chart
   * Creates a stacked bar chart showing participation data for each event
   * Only renders if there are events and participations available
   */
  renderEventParticipationChart(): void {
    // Only render if we have events and participations
    if (this.events.length === 0 || this.participations.length === 0) {
      return;
    }

    // Create data for stacked bar chart
    const eventData = this.events.map(event => {
      const registered = this.participations.filter(
        p => p.eventId == event.id && p.status === 'Registered'
      ).length;
      const attendedCount = this.participations.filter(
        p => p.eventId == event.id && p.attendance === 'Attended'
      ).length;
      const completedCount = this.participations.filter(
        p => p.eventId == event.id && p.attendance === 'Completed'
      ).length;
      return {
        category: event.title.length > 10 ? event.title.substring(0, 10) + '...' : event.title,
        fullTitle: event.title,
        eventId: event.id,
        Registered: registered,
        Attended: attendedCount,
        Completed: completedCount
      };
    });

    // Only render if we have meaningful data
    if (eventData.some(d => d.Registered > 0 || d.Attended > 0 || d.Completed > 0)) {
      this.chartService.createStackedBarChart(
        this.eventParticipationChart,
        eventData,
        ['Registered', 'Attended', 'Completed'],
        ['#9966FF', '#36A2EB', '#FF6384'],
        (label: string) => this.filterParticipationsByEventTitle(label, eventData)
      );
    }
  }

  /**
   * Filter participations by event title from chart click
   * Filters the participations table to show only participations for the selected event
   * @param label The short event title from the chart
   * @param eventData The event data array containing full titles
   */
  filterParticipationsByEventTitle(label: string, eventData: any[]): void {
    // Find the event with the matching short title
    const event = eventData.find(e => e.category === label);
    if (event) {
      this.filteredParticipations = this.participations.filter(p => {
        const ev = this.getEvent(p.eventId);
        return ev && ev.title === event.fullTitle;
      });
      this.selectedFilter = event.fullTitle;
      this.eventTitleFilter = event.fullTitle;
    }
  }

  /**
   * Filter participations based on button selection
   * Handles filtering by status or resetting to show all participations
   * @param filter The filter value ('all' or a status like 'Registered', 'Attended', etc.)
   */
  filterParticipations(filter: string): void {
    this.selectedFilter = filter;
    this.searchTerm = '';

    if (filter === 'all') {
      this.filteredParticipations = this.participations;
      this.eventTitleFilter = null; // Clear event title filter only when Show All is clicked
      this.statusFilter = null; // Clear status filter only when Show All is clicked
      this.searchFilter = null; // Clear search filter only when Show All is clicked
    } else {
      // Filter by status
      if (['Assigned', 'Pending', 'Registered', 'Attended', 'Completed'].includes(filter)) {
        this.filteredParticipations = this.participations.filter(p => p.status === filter);
        this.statusFilter = filter;
        this.eventTitleFilter = null; // Clear event title filter when filtering by status
        this.searchFilter = null; // Clear search filter when filtering by status
      }
    }
    
    // Reset to first page and calculate pagination
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Search participations by event name
   * Filters the participations table based on the search term entered by the user
   * Combines search with existing status filters if any are active
   */
  searchParticipations(): void {
    if (!this.searchTerm.trim()) {
      this.filterParticipations(this.selectedFilter);
      this.searchFilter = null;
      return;
    }
    this.searchFilter = this.searchTerm;
    const term = this.searchTerm.toLowerCase().trim();
    
    // First filter by selected status if not 'all'
    let filtered = this.selectedFilter === 'all' 
      ? this.participations 
      : this.participations.filter(p => p.status === this.selectedFilter);
    
    // Then filter by event name
    this.filteredParticipations = filtered.filter(p => {
      const event = this.getEvent(p.eventId);
      return event && event.title.toLowerCase().includes(term);
    });
    
    // Reset to first page and calculate pagination
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Get user by ID from the users array
   * Handles both string and number ID types for flexibility
   * @param userId The user ID to search for
   * @returns The user object if found, undefined otherwise
   */
  getUser(userId: number | string): User | undefined {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    return this.users.find(u => u.id == id);
  }

  /**
   * Logout the current user and redirect to login page
   * Clears the user session and navigates to the login page
   */
  logout(): void {
    this.authService.logout();
    // Navigate to login page
    window.location.href = '/login';
  }

  /**
   * Get event by ID from the events array
   * Handles both string and number ID types for flexibility
   * @param eventId The event ID to search for
   * @returns The event object if found, undefined otherwise
   */
  getEvent(eventId: number | string): Event | undefined {
    return this.events.find(event => event.id === eventId);
  }

  /**
   * Calculate pagination for filtered participations
   * Updates total items, total pages, and paginated data based on current filters
   * Ensures current page is within valid range and updates the displayed data
   */
  private calculatePagination(): void {
    this.totalItems = this.filteredParticipations.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    
    // Ensure current page is within valid range
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    
    // Calculate start and end indices
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Get paginated participations
    this.paginatedParticipations = this.filteredParticipations.slice(startIndex, endIndex);
  }

  /**
   * Navigate to a specific page in the pagination
   * Validates the page number and updates the current page if valid
   * @param page The page number to navigate to
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
    }
  }

  /**
   * Navigate to the next page in the pagination
   * Only allows navigation if there is a next page available
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  /**
   * Navigate to the previous page in the pagination
   * Only allows navigation if there is a previous page available
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  /**
   * Get array of page numbers for pagination display
   * Returns a smart range of page numbers around the current page
   * Shows all pages if total is small, or a window around current page if large
   * @returns Array of page numbers to display in the pagination controls
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
   * Change the number of items displayed per page
   * Resets to the first page when page size is changed
   * @param size The new number of items to display per page
   */
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.calculatePagination();
  }

  /**
   * Handle page size change from the template dropdown
   * Extracts the selected value and calls changePageSize with the new size
   * @param changeEvent The change event from the select element
   */
  onPageSizeChange(changeEvent: any): void {
    const target = changeEvent.target as HTMLSelectElement;
    if (target && target.value) {
      this.changePageSize(+target.value);
    }
  }

  // Make Math available in template
  Math = Math;

  /**
   * Open create event modal
   */
  // Remove showCreateEventModal, newEvent, openCreateEventModal, closeCreateEventModal, createEvent and related modal logic

  /**
   * Close create event modal
   */
  // Remove showCreateEventModal, newEvent, openCreateEventModal, closeCreateEventModal, createEvent and related modal logic
  
  /**
   * Create a new event
   */
  // Remove showCreateEventModal, newEvent, openCreateEventModal, closeCreateEventModal, createEvent and related modal logic

  /**
   * Update an existing event
   * Sends the updated event data to the server and reloads data on success
   * @param event The event object with updated data
   */
  editEvent(event: Event): void {
    this.eventService.updateEvent(event.id, event).subscribe({
      next: () => {
        this.loadEvents();
        this.loadParticipations();
        this.loadUsers();
        alert('Event updated successfully!');
      },
      error: (error) => {
        alert(`Failed to update event: ${error.message}`);
      }
    });
  }

  /**
   * Delete an event after user confirmation
   * Shows a confirmation dialog and deletes the event if confirmed
   * Reloads data after successful deletion
   * @param eventId The ID of the event to delete
   */
  deleteEvent(eventId: number | string): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.eventService.deleteEvent(eventId).subscribe({
        next: () => {
          this.loadEvents();
          this.loadParticipations();
          this.loadUsers();
          alert('Event deleted successfully!');
        },
        error: (error) => {
          alert(`Failed to delete event: ${error.message}`);
        }
      });
    }
  }
}