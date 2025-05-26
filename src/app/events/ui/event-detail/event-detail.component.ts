import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventModel } from '../../utils/event.model';
import { RouterModule } from '@angular/router';
import { DaysUntilPipe } from '../../../shared/utils/pipes/days-until.pipe';
import { resolveAssetUrl } from '../../../shared/utils/assets.utils';
import { AssetUrlPipe } from '../../../shared/utils/pipes/asset-url.pipe';

@Component({
  selector: 'app-event-detail',
  imports: [CommonModule, RouterModule, DaysUntilPipe, AssetUrlPipe],
  templateUrl: './event-detail.component.html',
  styles: `
    @use 'styles/index' as *;
    

    .container {
      margin: 1rem;
    }
    
    .event-detail {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      
    }

    h1 {
      @include heading(2);
    }
    `,
})
export class EventDetailComponent {
  @Input({ required: true }) event!: EventModel;

  // TODO: Possibly share this across components
  getBlockText(block: { children: { text: string }[] }): string {
    return block.children?.map((child) => child.text).join('') ?? '';
  }

  getHeroWebpUrl(): string | null {
    const url = this.event?.hero?.formats?.large?.url || this.event?.hero?.url;
    return resolveAssetUrl(url)?.replace(/\.jpg$/, '.webp') ?? null;
  }
}
