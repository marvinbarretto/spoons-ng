import { Injectable } from '@angular/core';
import { Badge } from '../utils/badge.model';
import { FirestoreCrudService } from '../../shared/data-access/firestore-crud.service';

@Injectable({
  providedIn: 'root'
})
export class BadgeDefinitionService extends FirestoreCrudService<Badge> {
  protected override path = 'badges'; // Shared badge definitions (not user-specific)
}
