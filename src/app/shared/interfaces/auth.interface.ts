/**
 * Interface for login credentials
 */
import { User } from './user.interface';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Interface for authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
}