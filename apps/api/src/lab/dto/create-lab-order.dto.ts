import { IsString, IsArray, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  visitId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  tests: string[];
}

export class LabResultItemDto {
  @IsString()
  @IsNotEmpty()
  testName: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  referenceRange?: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  findings?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  remarks?: string;
}

export class CreateLabResultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  labOrderId: string;

  @ApiProperty({ description: 'Array of test results', type: [LabResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  results: LabResultItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
