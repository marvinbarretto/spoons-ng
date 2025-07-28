import { Injectable } from '@angular/core';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import { Badge } from '../utils/badge.model';

@Injectable({
  providedIn: 'root',
})
export class BadgeDefinitionService extends FirestoreCrudService<Badge> {
  protected override path = 'badges'; // Shared badge definitions (not user-specific)
}
