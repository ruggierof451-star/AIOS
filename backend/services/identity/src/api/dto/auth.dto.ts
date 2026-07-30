import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Formato email non valido.' })
  email!: string;

  @IsString()
  @MinLength(10, { message: 'La password deve avere almeno 10 caratteri.' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Formato email non valido.' })
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
