import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsString()
  @IsNotEmpty()
  idempotency_key: string;

  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  customer_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  customer_phone?: string;
}
