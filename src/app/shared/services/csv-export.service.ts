import { Injectable } from '@angular/core';
import { Event } from '../interfaces/event.interface';
import { EventParticipation } from '../interfaces/event-participation.interface';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {

  constructor() { }

  /**
   * Export user participations to CSV
   * @param participations User's participations
   * @param events All events data
   * @param filename Optional filename
   */
  exportUserParticipations(participations: EventParticipation[], events: Event[], filename?: string): void {
    const csvData = this.convertParticipationsToCSV(participations, events);
    this.downloadCSV(csvData, filename || 'user_events_export.csv');
  }

  /**
   * Export filtered participations to CSV
   * @param participations User's participations
   * @param events All events data
   * @param filterType Type of filter applied
   * @param filterValue Filter value
   */
  exportFilteredParticipations(
    participations: EventParticipation[], 
    events: Event[], 
    filterType: string, 
    filterValue: string
  ): void {
    const filteredData = this.filterParticipations(participations, filterType, filterValue);
    const csvData = this.convertParticipationsToCSV(filteredData, events);
    const filename = `user_events_${filterType}_${filterValue}_export.csv`;
    this.downloadCSV(csvData, filename);
  }

  /**
   * Export participations by date range
   * @param participations User's participations
   * @param events All events data
   * @param startDate Start date
   * @param endDate End date
   */
  exportByDateRange(
    participations: EventParticipation[], 
    events: Event[], 
    startDate: string, 
    endDate: string
  ): void {
    const filteredData = this.filterByDateRange(participations, startDate, endDate);
    const csvData = this.convertParticipationsToCSV(filteredData, events);
    const filename = `user_events_${startDate}_to_${endDate}_export.csv`;
    this.downloadCSV(csvData, filename);
  }

  /**
   * Convert participations data to CSV format
   * @param participations User's participations
   * @param events All events data
   * @returns CSV string
   */
  private convertParticipationsToCSV(participations: EventParticipation[], events: Event[]): string {
    // CSV headers - even shorter names to prevent truncation
    const headers = [
      'Event Title',
      'Type', 
      'Date',
      'Time',
      'Location',
      'Status',
      'Attend',
      'Reg Date'
    ];

    // Convert data to CSV rows
    const rows = participations.map(participation => {
      const event = events.find(e => e.id === participation.eventId);
      if (!event) return null;

      return [
        this.escapeCSVField(this.truncateText(event.title, 20)),
        this.escapeCSVField(event.type),
        this.escapeCSVField(this.formatEventDate(event.date)),
        this.escapeCSVField(event.time),
        this.escapeCSVField(event.location),
        this.escapeCSVField(participation.status || ''),
        this.escapeCSVField(participation.attendance || ''),
        this.escapeCSVField(this.formatRegistrationDate(participation.registrationDate))
      ];
    }).filter(row => row !== null);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Truncate text to prevent column width issues
   * @param text Text to truncate
   * @param maxLength Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Filter participations by type and value
   * @param participations User's participations
   * @param filterType Type of filter
   * @param filterValue Filter value
   * @returns Filtered participations
   */
  private filterParticipations(
    participations: EventParticipation[], 
    filterType: string, 
    filterValue: string
  ): EventParticipation[] {
    switch (filterType) {
      case 'status':
        return participations.filter(p => p.status === filterValue);
      case 'attendance':
        return participations.filter(p => p.attendance === filterValue);
      case 'eventType':
        // This would need events data to filter by event type
        return participations;
      default:
        return participations;
    }
  }

  /**
   * Filter participations by date range
   * @param participations User's participations
   * @param startDate Start date
   * @param endDate End date
   * @returns Filtered participations
   */
  private filterByDateRange(
    participations: EventParticipation[], 
    startDate: string, 
    endDate: string
  ): EventParticipation[] {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    return participations.filter(participation => {
      const eventDate = new Date(participation.registrationDate);
      return eventDate >= start && eventDate <= end;
    });
  }

  /**
   * Escape CSV field to handle commas and quotes
   * @param field Field value
   * @returns Escaped field
   */
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Format date for CSV export
   * @param dateString Date string
   * @returns Formatted date
   */
  private formatEventDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
      }
      
      // Format as MM/DD/YY for better Excel compatibility and to prevent truncation
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2); // Use 2-digit year
      
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Error formatting event date:', dateString, error);
      // Return a safe fallback format
      return dateString.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'.slice(-2));
    }
  }

  /**
   * Format registration date for CSV export
   * @param dateString Date string
   * @returns Formatted date
   */
  private formatRegistrationDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
      }
      
      // Format as MM/DD/YY for better Excel compatibility and to prevent truncation
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2); // Use 2-digit year
      
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Error formatting registration date:', dateString, error);
      // Return a safe fallback format
      return dateString.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'.slice(-2));
    }
  }

  /**
   * Download CSV file
   * @param csvContent CSV content
   * @param filename Filename
   */
  private downloadCSV(csvContent: string, filename: string): void {
    // Add BOM for better Excel compatibility and ensure proper encoding
    const BOM = '\uFEFF';
    
    // Add some spacing to help with column width issues
    const formattedContent = csvContent
      .split('\n')
      .map(line => line.replace(/,/g, ', ')) // Add space after commas
      .join('\n');
    
    const blob = new Blob([BOM + formattedContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get export statistics
   * @param participations User's participations
   * @returns Export statistics
   */
  getExportStatistics(participations: EventParticipation[]): any {
    const total = participations.length;
    const byStatus = participations.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as any);
    
    const byAttendance = participations.reduce((acc, p) => {
      const status = p.attendance || 'Not Set';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as any);

    return {
      total,
      byStatus,
      byAttendance
    };
  }
} 