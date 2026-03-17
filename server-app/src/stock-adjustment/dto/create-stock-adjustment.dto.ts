import { IsUUID, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AdjustmentReason } from '../../entities/stock-adjustment.entity';

export class CreateStockAdjustmentDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsNumber()
  quantity_change: number;

  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
