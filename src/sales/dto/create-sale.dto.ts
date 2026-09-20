import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleStatus } from '../entities/sale.entity.js';

export class CreateSaleDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiPropertyOptional({ enum: SaleStatus, default: SaleStatus.PENDING })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiProperty({ type: [CreateSaleDetailDto] })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDetailDto)
  details: CreateSaleDetailDto[];
}
