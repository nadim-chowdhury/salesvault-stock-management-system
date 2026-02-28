import { IsUUID, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class AssignStockDto {
  @IsUUID()
  @IsNotEmpty()
  salesperson_id: string;

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
