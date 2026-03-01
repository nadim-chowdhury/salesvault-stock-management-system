import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ApproveSaleDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
