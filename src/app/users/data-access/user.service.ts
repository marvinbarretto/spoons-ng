import { Injectable } from '@angular/core';
import { DirectStrapiService } from '../../shared/data-access/strapi.service';
import { Observable } from 'rxjs';
import { User } from '../utils/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends DirectStrapiService {
  getUsers(): Observable<User[]> {
    return this.get<User[]>('users?populate=role');
  }

  getUserDetails(): Observable<User> {
    return this.get<User>('users/me?populate=role');
  }
}
