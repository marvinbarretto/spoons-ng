import { Component, effect } from '@angular/core';
import { StrapiEvent, EventStatus } from '../../utils/event.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EventService } from '../../data-access/event.service';
import { EventStore } from '../../data-access/event.store';
import { Router } from '@angular/router';
import { EventsNavComponent } from '../../ui/events-nav/events-nav.component';

@Component({
  selector: 'app-create-event',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, EventsNavComponent],
  templateUrl: './create-event-container.component.html',
  styleUrl: './create-event-container.component.scss',
})
export class CreateEventContainerComponent {
  // eventForm: FormGroup = new FormGroup({});
  // constructor(
  //   private fb: FormBuilder,
  //   private router: Router,
  //   public eventStore: EventStore
  // ) {
  //       // Use the `effect()` to observe changes in the `currentEvent$$` signal and redirect on success
  //       effect(() => {
  //         const createdEvent = this.eventStore.currentEvent$$();
  //         if (createdEvent) {
  //           this.router.navigate(['/events']);  // Redirect to events listing page
  //         }
  //       });
  // }
  // get title() {
  //   return this.eventForm.get('title');
  // }
  // get description() {
  //   return this.eventForm.get('description');
  // }
  // get date() {
  //   return this.eventForm.get('date');
  // }
  // get location() {
  //   return this.eventForm.get('location');
  // }
  // ngOnInit() {
  //   // TODO: add validators
  //   this.eventForm = this.fb.group({
  //     title: ['', Validators.required],
  //     description: ['', Validators.required],
  //     date: ['', Validators.required],
  //     location: ['', Validators.required],
  //     locale: [''],
  //     eventStatus: [EventStatus.PENDING]
  //   });
  // }
  //   // Helper function to generate a slug from the event title
  //   generateSlug(title: string): string {
  //     return title
  //       .toLowerCase()
  //       .trim()
  //       .replace(/[^\w\s-]/g, '')  // Remove special characters
  //       .replace(/\s+/g, '-');     // Replace spaces with hyphens
  //   }
  // onSubmit() {
  //   if (this.eventForm.invalid) {
  //     return;  // Exit if the form is invalid
  //   }
  //   const event: StrapiEvent = {
  //     ...this.eventForm.value,
  //     slug: this.generateSlug(this.eventForm.value.title)
  //   };
  //   // this.eventStore.createEvent(event);
  // }
}
