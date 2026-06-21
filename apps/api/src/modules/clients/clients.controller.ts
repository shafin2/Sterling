import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CreateClientSchema,
  UpdateClientSchema,
  ClientFiltersSchema,
  type CreateClientDto,
  type UpdateClientDto,
  type ClientFiltersDto,
} from '@sterling/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients with filters & pagination' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(ClientFiltersSchema)) filters: ClientFiltersDto,
  ) {
    return this.clientsService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single client' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  @Permissions('admin', 'owner', 'accountant')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateClientSchema)) dto: CreateClientDto,
  ) {
    return this.clientsService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @Permissions('admin', 'owner', 'accountant')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a client' })
  @Permissions('admin', 'owner')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.remove(tenantId, id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk soft-delete clients' })
  @Permissions('admin', 'owner')
  bulkDelete(
    @CurrentTenant() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.clientsService.bulkDelete(tenantId, body.ids);
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Import clients from parsed CSV rows' })
  @Permissions('admin', 'owner', 'accountant')
  importCsv(
    @CurrentTenant() tenantId: string,
    @Body() body: { rows: CreateClientDto[] },
  ) {
    return this.clientsService.importCsv(tenantId, body.rows);
  }
}
