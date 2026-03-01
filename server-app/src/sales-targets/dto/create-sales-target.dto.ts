import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';

export class CreateSalesTargetDto {
  @IsUUID()
  @IsNotEmpty()
  salesperson_id: string;

  @IsUUID()
  @IsNotEmpty()
  warehouse_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  target_amount: number;

  @IsDateString()
  @IsNotEmpty()
  period_start: string;

  @IsDateString()
  @IsNotEmpty()
  period_end: string;
}
