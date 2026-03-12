import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AutoReplyMode, ShiftType } from '@plantao-radar/shared';

export class UpsertFilterDto {
  @ApiProperty({ example: 'Clínica Médica' })
  @IsString()
  @MaxLength(100)
  specialty: string;

  @ApiProperty({ type: [String], example: ['São Paulo', 'Guarulhos'] })
  @IsArray()
  @IsString({ each: true })
  cities: string[];

  @ApiProperty({ type: [String], example: ['Hospital das Clínicas'] })
  @IsArray()
  @IsString({ each: true })
  hospitals: string[];

  @ApiProperty({ required: false, example: 1500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  minValue?: number;

  @ApiProperty({ required: false, example: 50 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxDistanceKm?: number;

  @ApiProperty({ enum: ShiftType, isArray: true })
  @IsArray()
  @IsEnum(ShiftType, { each: true })
  acceptedShifts: ShiftType[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  requiredKeywords: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  blockedKeywords: string[];

  @ApiProperty({ enum: AutoReplyMode, default: AutoReplyMode.DISABLED })
  @IsEnum(AutoReplyMode)
  autoReplyMode: AutoReplyMode;

  @ApiProperty({ minimum: 0, maximum: 1, default: 0.85 })
  @IsNumber()
  @Min(0)
  @Max(1)
  autoReplyThreshold: number;

  @ApiProperty({ minimum: 0, maximum: 1, default: 0.6 })
  @IsNumber()
  @Min(0)
  @Max(1)
  semiAutoThreshold: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  replyTemplate?: string;
}
