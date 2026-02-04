import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  quantity: number;
  price: number;
}

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsString()
  visitId: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  items: PrescriptionItem[];
}
