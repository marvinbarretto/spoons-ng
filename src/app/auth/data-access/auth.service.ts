import { Injectable } from '@angular/core';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from '../utils/auth.model';
import { Observable } from 'rxjs';
import { DirectStrapiService } from '../../shared/data-access/strapi.service';
import { User } from '../../users/utils/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends DirectStrapiService {
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.post<AuthResponse>(`auth/local`, payload);
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.post<AuthResponse>(`auth/local/register`, payload);
  }

  logout(): Observable<any> {
    return this.post<any>(`auth/logout`, {});
  }

  getCurrentUserWithRole(): Observable<User> {
    return this.get<User>(`users/me?populate=role`);
  }
}
