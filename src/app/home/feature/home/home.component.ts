import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { HeroComponent } from "../../../shared/ui/hero/hero.component";
import { AdvertWidgetComponent } from '../advert-widget/advert-widget.component';
import { FeedbackWidgetComponent } from '../feedback-widget/feedback-widget.component';
import { RegisterWidgetComponent } from "../register-widget/register-widget.component";
import { WaitComponent } from "../../../test/wait/wait.component";

@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    CommonModule,
    HeroComponent,
    AdvertWidgetComponent,
    FeedbackWidgetComponent,
    RegisterWidgetComponent,
    WaitComponent
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  authStore = inject(AuthStore);
}
