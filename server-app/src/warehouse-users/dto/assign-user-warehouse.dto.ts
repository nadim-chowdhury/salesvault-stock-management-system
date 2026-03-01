import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignUserWarehouseDto {
  @IsUUID()
  @IsNotEmpty()
  warehouse_id: string;

  @IsUUID()
  @IsNotEmpty()
  user_id: string;
}
