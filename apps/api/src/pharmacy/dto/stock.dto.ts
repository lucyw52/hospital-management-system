import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStockDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdateStockDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}
