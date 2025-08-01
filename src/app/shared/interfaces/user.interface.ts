/**
 * Interface representing a user in the system
 */
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}