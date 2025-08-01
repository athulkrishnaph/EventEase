/**
 * Interface representing an event in the system
 */
export interface Event {
  id: number | string;  // Allow both number and string IDs (random IDs are fine)
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'Webinar' | 'Workshop' | 'Meetup';
  capacity: number;
  createdBy: number; // admin id
}