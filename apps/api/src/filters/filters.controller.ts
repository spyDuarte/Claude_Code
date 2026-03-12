import { Controller, Get, Post, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FiltersService } from './filters.service';
import { UpsertFilterDto } from './dto/upsert-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('filters')
@Controller('filters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FiltersController {
  constructor(private filtersService: FiltersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user filter profile' })
  getFilter(@CurrentUser() user: User) {
    return this.filtersService.getFilter(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create filter profile' })
  createFilter(@CurrentUser() user: User, @Body() dto: UpsertFilterDto) {
    return this.filtersService.upsertFilter(user.id, dto);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update filter profile' })
  updateFilter(@CurrentUser() user: User, @Body() dto: UpsertFilterDto) {
    return this.filtersService.upsertFilter(user.id, dto);
  }
}
