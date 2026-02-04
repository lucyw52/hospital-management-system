import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  visitId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  tests: string[];
}

export class CreateLabResultDto {
  @ApiProperty()
  @IsString()
  labOrderId: string;

  @ApiProperty({ description: 'JSON object with test results' })
  results: any;

  @ApiProperty({ required: false })
  attachmentUrl?: string;
}
