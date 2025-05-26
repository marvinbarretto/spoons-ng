import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { HeroComponent } from "../../../shared/ui/hero/hero.component";
import { AdvertWidgetComponent } from '../advert-widget/advert-widget.component';
import { FeedbackWidgetComponent } from '../feedback-widget/feedback-widget.component';
import { RegisterWidgetComponent } from "../register-widget/register-widget.component";
import { WaitComponent } from "../../../test/wait/wait.component";
import { FirestoreService } from '../../../auth/data-access/firestore.service';
import { PubListComponent } from "../../../pubs/ui/pub-list/pub-list.component";


@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    CommonModule,
    HeroComponent,
    AdvertWidgetComponent,
    FeedbackWidgetComponent,
    RegisterWidgetComponent,
    WaitComponent,
    PubListComponent
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  authStore = inject(AuthStore);
  firestoreService = inject(FirestoreService);

  readonly data$$ = signal<any[]>([]);

  constructor() {
    this.firestoreService.getData().subscribe((data) => {
      this.data$$.set(data);
    });
  }
}
