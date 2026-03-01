import {
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class UpdateSalesTargetDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  target_amount?: number;

  @IsDateString()
  @IsOptional()
  period_start?: string;

  @IsDateString()
  @IsOptional()
  period_end?: string;
}
