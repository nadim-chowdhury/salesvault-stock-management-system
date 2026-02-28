import {
  IsString,
  MaxLength,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  cost_price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
