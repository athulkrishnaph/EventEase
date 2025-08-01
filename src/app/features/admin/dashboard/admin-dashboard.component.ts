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

  // Utility: Remove participations for deleted events
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
   * Render user statistics chart
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
   * Render event participation chart
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
   * Filter participations based on chart selection
   * @param filter Filter value
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
   * Get user by ID
   * @param userId User ID
   * @returns User object
   */
  getUser(userId: number | string): User | undefined {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    return this.users.find(u => u.id == id);
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.authService.logout();
    // Navigate to login page
    window.location.href = '/login';
  }

  /**
   * Get event by ID
   * @param eventId Event ID
   * @returns Event or undefined
   */
  getEvent(eventId: number | string): Event | undefined {
    return this.events.find(event => event.id === eventId);
  }

  /**
   * Calculate pagination for filtered participations
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