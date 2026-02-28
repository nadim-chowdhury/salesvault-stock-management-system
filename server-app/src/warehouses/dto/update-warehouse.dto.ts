import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
