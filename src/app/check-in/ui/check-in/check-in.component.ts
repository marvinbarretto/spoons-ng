import { Component, inject, input } from '@angular/core';
import type { Pub } from '../../../pubs/utils/pub.models';
import { ButtonComponent } from "../../../shared/ui/button/button.component";
import { AuthService } from "../../../auth/data-access/auth.service";

@Component({
  selector: 'app-check-in',
  imports: [ButtonComponent],
  templateUrl: './check-in.component.html',
  styleUrl: './check-in.component.scss'
})
export class CheckInComponent {
  closestPub = input<Pub | null>()
  private auth = inject(AuthService)

  checkIn() {
    const pub = this.closestPub()
    const user = this.auth.user$$()
    const uid = user?.uid

    if (!pub) {
      console.warn('[CheckInComponent] No pub selected. Cannot check in.')
      return
    }

    if (!user) {
      console.error('[CheckInComponent] No user found! AuthService may not have initialized.')
      return
    }

    if (user.isAnonymous) {
      console.log(`[CheckInComponent] Anonymous user ${uid} is checking in to "${pub.name}"`)
    } else {
      console.log(`[CheckInComponent] Registered user ${uid} is checking in to "${pub.name}"`)
    }

  }
}
