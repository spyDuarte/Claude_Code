import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MonitorGroupDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty()
  @IsBoolean()
  monitoringEnabled: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
