import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EventService } from './shared/services/event.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'event-ease';

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    // Clean up orphaned participations on app startup
    this.eventService.cleanupAllOrphanedParticipations();
  }
}
