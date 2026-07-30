import type { JsonObject } from '@aios/domain-model';
import { IsString, MinLength, IsOptional, IsIn, IsObject, IsNumber } from 'class-validator';

const PLAN_VALUES = ['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'] as const;
type PlanValue = (typeof PLAN_VALUES)[number];

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Il nome non può essere vuoto.' })
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsIn(PLAN_VALUES)
  plan?: PlanValue;

  // Campi anagrafici/fiscali/di localizzazione: solo validazione di tipo
  // di base in questo incremento (stringa non vuota se presente) —
  // le validazioni robuste (formato P.IVA, codice fiscale, ISO
  // timezone/lingua/valuta) sono deliberatamente fuori scope, arrivano
  // insieme alla Feature che le userà davvero (vedi piano tecnico).
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  pec?: string;

  @IsOptional()
  @IsString()
  sdi?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  fiscalYearStart?: number;

  @IsOptional()
  @IsNumber()
  fiscalYearEnd?: number;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  settings?: JsonObject;
}

export class ChangePlanDto {
  @IsIn(PLAN_VALUES)
  plan!: PlanValue;
}
