import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../shared/interfaces/user.interface';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.users = [];
        this.filteredUsers = [];
      }
    });
  }

  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredUsers = this.users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }
  }

  toggleRole(user: User): void {
    const newRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';
    const updatedUser: User = { ...user, role: newRole };
    
    this.authService.updateUser(user.id, updatedUser).subscribe({
      next: () => {
        // Update the user in the local array
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.filterUsers();
        }
        alert(`User role updated to ${newRole}`);
      },
      error: (error) => {
        console.error('Failed to update user role:', error);
        alert(`Failed to update user role: ${error.message}`);
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      this.authService.deleteUser(user.id).subscribe({
        next: () => {
          // Remove the user from the local array
          this.users = this.users.filter(u => u.id !== user.id);
          this.filterUsers();
          alert('User deleted successfully');
        },
        error: (error) => {
          console.error('Failed to delete user:', error);
          alert(`Failed to delete user: ${error.message}`);
        }
      });
    }
  }
}