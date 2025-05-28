import { Component } from '@angular/core';
import { DevDebugComponent } from "../../utils/dev-debug.component";

@Component({
  selector: 'app-footer',
  imports: [DevDebugComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
