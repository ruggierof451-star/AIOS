import { IsString, MinLength } from 'class-validator';

export class RecordLegalConsentDto {
  @IsString()
  @MinLength(1, { message: "L'id della sessione non può essere vuoto." })
  conversationId!: string;
}
