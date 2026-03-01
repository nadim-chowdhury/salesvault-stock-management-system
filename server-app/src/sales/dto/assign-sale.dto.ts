import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignSaleDto {
  @IsUUID()
  @IsNotEmpty()
  salesperson_id: string;
}
