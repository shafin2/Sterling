import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Public')
@Controller('public/invoices')
export class PublicInvoiceController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get invoice by share token — no auth required' })
  findByShareToken(@Param('token') token: string) {
    return this.invoicesService.findByShareToken(token);
  }
}
