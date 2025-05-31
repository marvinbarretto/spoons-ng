import { Component } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';

@Component({
  selector: 'app-modal',
  imports: [PortalModule],

  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

}
