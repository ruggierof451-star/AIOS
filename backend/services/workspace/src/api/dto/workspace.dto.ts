import { IsString, MinLength, IsEmail, IsOptional } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  organizationId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  creatorRoleName?: string;
}

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  roleName!: string;
}

export class AcceptInviteDto {
  @IsString()
  token!: string;
}

export class ChangeMemberRoleDto {
  @IsString()
  newRoleName!: string;
}
