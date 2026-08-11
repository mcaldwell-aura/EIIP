import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  TIMELINE_EVENTS,
  TIMELINE_EVENT_TYPE_LABELS,
  TIMELINE_EVENT_ICONS,
  type TimelineEventRecord,
  type TimelineEventType,
} from './candidate-activity-timeline.data';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

type EventFilter = {
  eventType: TimelineEventType;
  label: string;
  icon: string;
  checked: boolean;
  count: number;
};

@Component({
  selector: 'app-candidate-activity-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, RippleModule],
  templateUrl: './candidate-activity-timeline.component.html',
  styleUrl: './candidate-activity-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateActivityTimelineComponent {
  candidateId = input.required<string>();

  // State for pagination
  private readonly itemsPerPage = 10;
  private readonly displayedCountState = signal(this.itemsPerPage);

  // State for filters
  private readonly filterStateMap = signal<Record<TimelineEventType, boolean>>({
    'appointment-scheduled': true,
    'appointment-completed': true,
    'appointment-cancelled': true,
    'inspection-started': true,
    'inspection-completed': true,
    'inspection-cancelled': true,
    'finding-added': true,
    'note-added': true,
    'attachment-added': true,
    'status-changed': true,
    'source-update': true,
  });

  // State for filter tooltip visibility
  protected readonly filterTooltipOpen = signal(false);

  // Get all events for the candidate
  private readonly allCandidateEvents = computed(() => {
    return TIMELINE_EVENTS.filter((event) => event.candidateId === this.candidateId()).sort(
      (a, b) => b.timestampMs - a.timestampMs,
    );
  });

  // Compute event filters with counts
  protected readonly eventFilters = computed(() => {
    const filterState = this.filterStateMap();
    const events = this.allCandidateEvents();

    const eventTypeCounts: Record<TimelineEventType, number> = {
      'appointment-scheduled': 0,
      'appointment-completed': 0,
      'appointment-cancelled': 0,
      'inspection-started': 0,
      'inspection-completed': 0,
      'inspection-cancelled': 0,
      'finding-added': 0,
      'note-added': 0,
      'attachment-added': 0,
      'status-changed': 0,
      'source-update': 0,
    };

    events.forEach((event) => {
      eventTypeCounts[event.eventType]++;
    });

    const eventTypeList: TimelineEventType[] = [
      'appointment-scheduled',
      'appointment-completed',
      'appointment-cancelled',
      'inspection-started',
      'inspection-completed',
      'inspection-cancelled',
      'finding-added',
      'note-added',
      'attachment-added',
      'status-changed',
      'source-update',
    ];

    return eventTypeList.map((eventType) => ({
      eventType,
      label: TIMELINE_EVENT_TYPE_LABELS[eventType],
      icon: TIMELINE_EVENT_ICONS[eventType],
      checked: filterState[eventType],
      count: eventTypeCounts[eventType],
    }));
  });

  // Filter events based on active filters
  private readonly filteredEvents = computed(() => {
    const filterState = this.filterStateMap();
    return this.allCandidateEvents().filter((event) => filterState[event.eventType]);
  });

  // Display only the first N events based on displayedCount
  protected readonly displayedEvents = computed(() => {
    return this.filteredEvents().slice(0, this.displayedCountState());
  });

  // Check if there are more events to load
  protected readonly hasMoreEvents = computed(() => {
    return this.filteredEvents().length > this.displayedCountState();
  });

  // Total event count for display
  protected readonly totalEventCount = computed(() => {
    return this.filteredEvents().length;
  });

  // Check if any filters are selected
  protected readonly hasActiveFilters = computed(() => {
    const filterState = this.filterStateMap();
    return Object.values(filterState).some((isChecked) => isChecked);
  });

  protected onFilterChange(eventType: TimelineEventType, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const currentState = this.filterStateMap();
    this.filterStateMap.set({
      ...currentState,
      [eventType]: checked,
    });
  }

  protected toggleFilterTooltip(): void {
    this.filterTooltipOpen.update((isOpen) => !isOpen);
  }

  protected closeFilterTooltip(): void {
    this.filterTooltipOpen.set(false);
  }

  protected clearAllFilters(): void {
    this.filterStateMap.set({
      'appointment-scheduled': true,
      'appointment-completed': true,
      'appointment-cancelled': true,
      'inspection-started': true,
      'inspection-completed': true,
      'inspection-cancelled': true,
      'finding-added': true,
      'note-added': true,
      'attachment-added': true,
      'status-changed': true,
      'source-update': true,
    });
  }

  protected loadMoreEvents(): void {
    this.displayedCountState.update((current) => current + this.itemsPerPage);
  }

  protected formatDateTime(timestamp: string): string {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const hour = date.getHours() % 12 || 12;
    const minute = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';

    return `${month}/${day}/${year} ${hour}:${minute} ${ampm}`;
  }

  protected getEventIcon(eventType: TimelineEventType): string {
    return TIMELINE_EVENT_ICONS[eventType];
  }
}
