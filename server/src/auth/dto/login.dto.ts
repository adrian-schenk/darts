export interface LoginDto {
  username: string;
  password: string;
  twoFactorCode?: string;
}
