import { Component, ElementRef, OnInit, OnChanges, SimpleChanges, DoCheck, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../shared/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ChartService } from '../../../shared/services/chart.service';
import { CsvExportService } from '../../../shared/services/csv-export.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { EventParticipation } from '../../../shared/interfaces/event-participation.interface';
import { User } from '../../../shared/interfaces/user.interface';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit, DoCheck {
  @ViewChild('eventsDistributionChart', { static: true }) eventsDistributionChart!: ElementRef;
  @ViewChild('eventsOverviewChart', { static: true }) eventsOverviewChart!: ElementRef;
  @ViewChild('attendanceSummaryChart', { static: true }) attendanceSummaryChart!: ElementRef;

  currentUser: User | null = null;
  events: Event[] = [];
  participations: EventParticipation[] = [];
  allParticipations: EventParticipation[] = []; // Store all participations for charts
  filteredEvents: Event[] = [];
  selectedFilter: string = 'all';
  selectedEvent: Event | null = null;
  showEventModal: boolean = false;

  // Export modal properties
  showExportModal: boolean = false;
  exportType: string = 'all';
  exportStatus: string = '';
  exportAttendance: string = '';
  exportStartDate: string = '';
  exportEndDate: string = '';
  isExporting: boolean = false;

  // Track previous state for change detection
  private previousParticipationsLength: number = 0;
  private previousParticipationsData: string = '';

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private chartService: ChartService,
    private csvExportService: CsvExportService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadEvents();
    this.loadParticipations();
  }

  /**
   * Custom change detection to monitor participations data
   */
  ngDoCheck(): void {
    // Check if participations data has changed
    const currentParticipationsLength = this.allParticipations.length;
    const currentParticipationsData = JSON.stringify(this.allParticipations.map(p => ({ id: p.id, status: p.status, attendance: p.attendance })));
    
    // If participations have changed, update charts
    if (currentParticipationsLength !== this.previousParticipationsLength || 
        currentParticipationsData !== this.previousParticipationsData) {
      
      console.log('Participations data changed, updating charts...');
      this.updateCharts();
      
      // Update previous state
      this.previousParticipationsLength = currentParticipationsLength;
      this.previousParticipationsData = currentParticipationsData;
    }
  }

  /**
   * Update all charts with current data
   */
  private updateCharts(): void {
    console.log('Updating charts with current data...');
    console.log('Current allParticipations length:', this.allParticipations.length);
    console.log('Current participations:', this.allParticipations);
    
    // Clear existing charts first
    this.clearCharts();
    
    // Re-render charts with fresh data
    this.renderEventsOverviewChart();
    this.renderAttendanceSummaryChart();
  }

  /**
   * Clear all charts
   */
  private clearCharts(): void {
    if (this.eventsOverviewChart?.nativeElement) {
      this.eventsOverviewChart.nativeElement.innerHTML = '';
    }
    if (this.attendanceSummaryChart?.nativeElement) {
      this.attendanceSummaryChart.nativeElement.innerHTML = '';
    }
  }

  /**
   * Force chart updates (can be called manually if needed)
   */
  forceChartUpdate(): void {
    console.log('Forcing chart updates...');
    this.updateCharts();
  }

  /**
   * Open export modal
   */
  openExportModal(): void {
    this.showExportModal = true;
    this.resetExportForm();
  }

  /**
   * Close export modal
   */
  closeExportModal(): void {
    this.showExportModal = false;
    this.isExporting = false;
  }

  /**
   * Reset export form
   */
  resetExportForm(): void {
    this.exportType = 'all';
    this.exportStatus = '';
    this.exportAttendance = '';
    this.exportStartDate = '';
    this.exportEndDate = '';
  }

  /**
   * Export data based on selected options
   */
  exportData(): void {
    if (!this.allParticipations.length) {
      alert('No data available for export.');
      return;
    }

    this.isExporting = true;

    try {
      switch (this.exportType) {
        case 'all':
          this.csvExportService.exportUserParticipations(this.allParticipations, this.events);
          break;
        case 'status':
          if (this.exportStatus) {
            this.csvExportService.exportFilteredParticipations(this.allParticipations, this.events, 'status', this.exportStatus);
          } else {
            alert('Please select a status filter.');
            this.isExporting = false;
            return;
          }
          break;
        case 'attendance':
          if (this.exportAttendance) {
            this.csvExportService.exportFilteredParticipations(this.allParticipations, this.events, 'attendance', this.exportAttendance);
          } else {
            alert('Please select an attendance filter.');
            this.isExporting = false;
            return;
          }
          break;
        case 'dateRange':
          if (this.exportStartDate && this.exportEndDate) {
            this.csvExportService.exportByDateRange(this.allParticipations, this.events, this.exportStartDate, this.exportEndDate);
          } else {
            alert('Please select both start and end dates.');
            this.isExporting = false;
            return;
          }
          break;
        default:
          this.csvExportService.exportUserParticipations(this.allParticipations, this.events);
      }

      setTimeout(() => {
        this.isExporting = false;
        this.closeExportModal();
        alert('Export completed successfully!');
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      this.isExporting = false;
      alert('Export failed. Please try again.');
    }
  }

  /**
   * Get export statistics
   */
  getExportStats(): any {
    return this.csvExportService.getExportStatistics(this.allParticipations);
  }

  /**
   * Load all events
   */
  loadEvents(): void {
    this.eventService.getEvents().subscribe(events => {
      this.events = events;
      this.filteredEvents = events;
      this.renderEventsDistributionChart();
    });
  }

  /**
   * Load user participations
   */
  loadParticipations(callback?: () => void): void {
    if (this.currentUser) {
      this.eventService.getUserParticipations(this.currentUser.id).subscribe((participations: EventParticipation[]) => {
        this.participations = participations;
        this.allParticipations = participations; // Store all participations
        
        // Update charts with fresh data
        this.renderEventsOverviewChart();
        this.renderAttendanceSummaryChart();
        
        // Reset change detection tracking
        this.previousParticipationsLength = participations.length;
        this.previousParticipationsData = JSON.stringify(participations.map(p => ({ id: p.id, status: p.status, attendance: p.attendance })));
        
        if (callback) callback();
      });
    }
  }

  /**
   * Reload participations and update charts
   */
  reloadParticipationsAndCharts(): void {
    this.loadParticipations(() => {
      console.log('Participations reloaded, charts updated');
    });
  }

  /**
   * Render events distribution chart (by event type)
   */
  renderEventsDistributionChart(): void {
    const eventTypes = ['Webinar', 'Workshop', 'Meetup'];
    const data = eventTypes.map(type => ({
      label: type,
      value: this.events.filter(event => event.type === type).length
    }));

    this.chartService.createDonutChart(
      this.eventsDistributionChart,
      data,
      ['#FF6384', '#36A2EB', '#FFCE56'],
      (label) => this.filterTableByEventType(label)
    );
  }

  /**
   * Render events overview chart (by participation status)
   */
  renderEventsOverviewChart(): void {
    // Always use all participations for this chart, regardless of table filtering
    const allParticipations = this.allParticipations;
    const statuses = ['Assigned', 'Pending', 'Registered'];
    const data = statuses.map(status => ({
      label: status,
      value: allParticipations.filter(p => p.status === status).length
    }));

    console.log('Rendering Events Overview Chart with data:', data);
    console.log('All participations:', allParticipations);

    this.chartService.createBarChart(
      this.eventsOverviewChart,
      data,
      ['#17a2b8', '#ffc107', '#6f42c1'],
      (label) => this.filterTableByStatus(label)
    );
  }

  /**
   * Render attendance summary chart
   */
  renderAttendanceSummaryChart(): void {
    // Always use all participations for this chart, regardless of table filtering
    const allParticipations = this.allParticipations;
    const attendances = ['Attended', 'Completed'];
    const data = attendances.map(attendance => ({
      label: attendance,
      value: allParticipations.filter(p => p.attendance === attendance).length
    }));

    console.log('Rendering Attendance Summary Chart with data:', data);
    console.log('All participations for attendance:', allParticipations);

    this.chartService.createBarChart(
      this.attendanceSummaryChart,
      data,
      ['#dc3545', '#28a745'],
      (label) => this.filterTableByAttendance(label)
    );
  }

  /**
   * Filter table by event type (for Events Distribution chart)
   */
  filterTableByEventType(filter: string): void {
    this.selectedFilter = filter;

    if (filter === 'all') {
      this.filteredEvents = this.events;
      return;
    }

    // Filter by event type
    if (['Webinar', 'Workshop', 'Meetup'].includes(filter)) {
      this.filteredEvents = this.events.filter(event => event.type === filter);
    }
  }

  /**
   * Filter table by participation status (for Events Overview and Attendance Summary charts)
   */
  filterTableByStatus(filter: string): void {
    this.selectedFilter = filter;

    if (filter === 'all') {
      this.filteredEvents = this.events;
      return;
    }

    // Filter by participation status - use allParticipations to ensure we get all relevant events
    if (['Assigned', 'Pending', 'Registered', 'Attended', 'Completed'].includes(filter)) {
      const eventIds = this.allParticipations
        .filter(p => p.status === filter)
        .map(p => p.eventId.toString());
      this.filteredEvents = this.events.filter(event => eventIds.includes(event.id.toString()));
    }
  }

  /**
   * Filter table by attendance status (for Attendance Summary chart)
   */
  filterTableByAttendance(filter: string): void {
    this.selectedFilter = filter;

    if (filter === 'all') {
      this.filteredEvents = this.events;
      return;
    }

    // Filter by attendance status - use allParticipations to ensure we get all relevant events
    if (['Attended', 'Completed'].includes(filter)) {
      const eventIds = this.allParticipations
        .filter(p => p.attendance === filter)
        .map(p => p.eventId.toString());
      this.filteredEvents = this.events.filter(event => eventIds.includes(event.id.toString()));
    }
  }

  /**
   * Filter events based on chart selection (legacy method - keeping for compatibility)
   */
  filterEvents(filter: string): void {
    this.filterTableByStatus(filter);
  }

  /**
   * Register for an event
   */
  registerForEvent(eventId: number | string): void {
    if (!this.currentUser) return;
    
    // Validate that eventId is not null or undefined
    if (!eventId || eventId === null || eventId === undefined) {
      alert('Invalid event ID. Cannot register for this event.');
      return;
    }

    // Check if event exists
    const event = this.getEvent(eventId);
    if (!event) {
      alert('Event not found. Cannot register for this event.');
      return;
    }

    const newParticipation: EventParticipation = {
      id: Date.now(),
      userId: this.currentUser.id,
      eventId: eventId,
      status: 'Registered',
      attendance: null,
      registrationDate: new Date().toISOString()
    };

    this.eventService.createParticipation(newParticipation).subscribe({
      next: () => {
        console.log('Registration successful, reloading data from server...');
        
        // Reload participations from server to ensure we have the latest data
        this.loadParticipations(() => {
          console.log('Data reloaded from server, charts should now be accurate');
          // Force chart update after data reload
          setTimeout(() => {
            this.updateCharts();
          }, 200);
        });
      },
      error: (error) => {
        alert(`Registration failed: ${error.message}`);
      }
    });
  }

  /**
   * Update participation status (Assigned, Pending, Registered)
   */
  updateParticipationStatus(participationId: number, status: 'Assigned' | 'Pending' | 'Registered', eventId: number | string): void {
    if (!this.currentUser) return;

    // If status is changing to Assigned or Pending, clear attendance
    const shouldClearAttendance = status === 'Assigned' || status === 'Pending';

    this.eventService.updateParticipationStatus(
      this.currentUser.id,
      eventId,
      status
    ).subscribe({
      next: () => {
        // Update the participation in both arrays
        const participation = this.allParticipations.find(p => p.id === participationId);
        if (participation) {
          participation.status = status;
          // Clear attendance if status is Assigned or Pending
          if (shouldClearAttendance) {
            participation.attendance = null;
          }
          // Also update in participations array if it exists there
          const participationInFiltered = this.participations.find(p => p.id === participationId);
          if (participationInFiltered) {
            participationInFiltered.status = status;
            if (shouldClearAttendance) {
              participationInFiltered.attendance = null;
            }
          }
        }
        // Re-render charts to reflect the change
        this.renderEventsOverviewChart();
        this.renderAttendanceSummaryChart();
      },
      error: (error) => {
        console.error('Status update failed:', error);
        alert(`Status update failed: ${error.message}`);
        // Reload participations to ensure data consistency
        this.loadParticipations();
      }
    });
  }

  /**
   * Update attendance status (Attended, Completed)
   */
  updateAttendanceStatus(participationId: number, attendance: 'Attended' | 'Completed', eventId: number | string): void {
    if (!this.currentUser) return;

    // Use the participation ID directly instead of looking it up again
    this.eventService.updateParticipationAttendance(
      this.currentUser.id,
      eventId,
      attendance
    ).subscribe({
      next: () => {
        // Update the participation in both arrays
        const participation = this.allParticipations.find(p => p.id === participationId);
        if (participation) {
          participation.attendance = attendance;
          // Also update in participations array if it exists there
          const participationInFiltered = this.participations.find(p => p.id === participationId);
          if (participationInFiltered) {
            participationInFiltered.attendance = attendance;
          }
        }
        // Re-render charts to reflect the change
        this.renderEventsOverviewChart();
        this.renderAttendanceSummaryChart();
      },
      error: (error) => {
        console.error('Attendance update failed:', error);
        alert(`Attendance update failed: ${error.message}`);
        // Reload participations to ensure data consistency
        this.loadParticipations();
      }
    });
  }

  /**
   * Get participation for an event
   */
  getParticipation(eventId: number | string): EventParticipation | undefined {
    // Always use allParticipations to ensure we find the participation regardless of table filtering
    return this.allParticipations.find(p => p.eventId.toString() === eventId.toString());
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: number | string): Event | undefined {
    return this.events.find(e => e.id.toString() === eventId.toString());
  }

  /**
   * Open event details modal
   */
  openEventModal(event: Event): void {
    this.selectedEvent = event;
    this.showEventModal = true;
  }

  /**
   * Close event details modal
   */
  closeEventModal(): void {
    this.selectedEvent = null;
    this.showEventModal = false;
  }

  // Filter participations to only those with existing events
  getValidParticipations(): EventParticipation[] {
    return this.allParticipations.filter(p => this.getEvent(p.eventId));
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.authService.logout();
    // Navigate to login page
    window.location.href = '/login';
  }

  // In template, use getEvent(event.id) to check for event existence
  // In modal, show a message if selectedEvent is null or missing
}