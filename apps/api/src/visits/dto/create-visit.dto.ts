import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VisitType } from '@prisma/client';

export class CreateVisitDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiProperty({ enum: VisitType })
  @IsEnum(VisitType)
  visitType: VisitType;
}
