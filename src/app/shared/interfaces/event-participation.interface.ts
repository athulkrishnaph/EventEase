/**
 * Interface representing event participation
 */
export interface EventParticipation {
  id: number;
  userId: number | string;
  eventId: number | string;
  status: 'Assigned' | 'Pending' | 'Registered';
  attendance: 'Attended' | 'Completed' | null;
  registrationDate: string;
}