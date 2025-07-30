import { PortalModule } from '@angular/cdk/portal';
import { Component } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [PortalModule],

  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {}
