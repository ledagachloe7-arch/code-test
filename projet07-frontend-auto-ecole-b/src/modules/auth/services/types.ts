// Types pour les services d'authentification

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ROLE_ADMIN' | 'instructor' | 'student' | 'ROLE_AUTO_ECOLE';
  createdAt: Date;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  captcha_id?: string;
  captcha_code?: string;
}

export interface CaptchaResponse {
  success: boolean;
  captcha_id: string;
  image: string;
  expires_in: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
