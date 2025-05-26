import { User } from '../../users/utils/user.model';

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface RegisterForm extends RegisterPayload {
  confirmPassword: string;
}
