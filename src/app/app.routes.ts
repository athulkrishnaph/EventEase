import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./core/auth/login/login.component').then(m => m.LoginComponent) 
  },
  {
    path: 'user',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/user/dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/admin/events/admin-events.component').then(m => m.AdminEventsComponent)
      },
      {
        path: 'events/create',
        loadComponent: () => import('./features/admin/event-form/event-form.component').then(m => m.EventFormComponent)
      },
      {
        path: 'events/edit/:id',
        loadComponent: () => import('./features/admin/event-form/event-form.component').then(m => m.EventFormComponent)
      },

    ]
  },
  { path: '**', redirectTo: '/login' }
];
