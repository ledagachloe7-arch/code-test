export interface SmsPayload {
  numero: string;
  message: string;
}

export interface SmsResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export const SMS_MAX_LENGTH = 160;
