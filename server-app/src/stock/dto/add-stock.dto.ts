import { IsUUID, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class AddStockDto {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsUUID()
  @IsNotEmpty()
  warehouse_id: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
