# EventEase - Event Management System

A modern event management system built with Angular and JSON Server.

## Features

- **User Dashboard**: Track events and participation with interactive charts
- **Admin Dashboard**: Manage events and monitor user participation
- **Event Management**: Create, edit, and delete events
- **User Registration**: Register for events and track attendance
- **Real-time Charts**: Interactive charts for data visualization
- **Auto-sync**: Automatic synchronization of user registrations

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Angular CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Option 1: Standard JSON Server (Manual Sync)
```bash
# Terminal 1: Start the standard JSON server
npm run server

# Terminal 2: Start the Angular application
npm start
```

#### Option 2: Auto-Sync Server (Recommended)
```bash
# Terminal 1: Start the auto-sync JSON server
npm run server:sync

# Terminal 2: Start the Angular application
npm start
```

### Auto-Sync Feature

The auto-sync server automatically maintains the `userRegistrations` array in sync with the `participations` array. When a user registers for an event:

1. **New participation** is added to `participations` array
2. **userRegistrations** is automatically updated
3. **No manual intervention** required

### Login Credentials

#### Admin Users:
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: Admin (can manage events)

- **Email**: manager@example.com  
- **Password**: manager123
- **Role**: Admin (can manage events)

#### Regular Users:
- **Email**: user@example.com
- **Password**: user123
- **Role**: User (can register for events)

- **Email**: john@example.com
- **Password**: john123
- **Role**: User (can register for events)

- **Email**: jane@example.com
- **Password**: jane123
- **Role**: User (can register for events)

## API Endpoints

- `GET /users` - Get all users
- `GET /events` - Get all events
- `GET /participations` - Get all participations
- `GET /userRegistrations` - Get user registration summaries
- `POST /participations` - Register for an event (auto-syncs userRegistrations)
- `PATCH /participations/:id` - Update participation status (auto-syncs userRegistrations)

## Architecture

- **Frontend**: Angular 19 with TypeScript
- **Backend**: JSON Server with custom middleware
- **Charts**: D3.js for data visualization
- **Styling**: Bootstrap 5 for responsive design

## Features

### User Dashboard
- Interactive charts (Events Distribution, Events Overview, Attendance Summary)
- Event registration and status tracking
- Real-time data updates
- Modal event details

### Admin Dashboard  
- User participation statistics
- Event-wise participation charts
- User management capabilities
- Event creation and management

### Auto-Sync Benefits
- **Automatic Updates**: userRegistrations stays in sync
- **No Manual Work**: No need to manually update arrays
- **Data Consistency**: Ensures data integrity
- **Real-time**: Immediate synchronization

## Development

### Adding New Features
1. Update the Angular components
2. Modify the JSON Server middleware if needed
3. Test with the auto-sync server

### Database Schema
- `users`: User accounts and roles
- `events`: Event information
- `participations`: User event registrations
- `userRegistrations`: Auto-synced user registration summaries
