import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdmissionDto {
  @ApiProperty()
  @IsString()
  visitId: string;

  @ApiProperty()
  @IsString()
  wardName: string;

  @ApiProperty()
  @IsString()
  bedNumber: string;
}
