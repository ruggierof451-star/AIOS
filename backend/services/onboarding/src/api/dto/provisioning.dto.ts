import { IsString, MinLength } from 'class-validator';

export class ProvisionTenantDto {
  @IsString()
  @MinLength(1, { message: 'L\'id della sessione non può essere vuoto.' })
  conversationId!: string;

  @IsString()
  @MinLength(1, { message: 'Il nome non può essere vuoto.' })
  name!: string;
}
