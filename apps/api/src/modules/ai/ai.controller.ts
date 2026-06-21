import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('assist')
  @ApiOperation({ summary: 'Improve text with AI (grammar, formal, beautify, etc.)' })
  assistText(
    @Body() body: { text: string; action: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.aiService.assistText({
      text: body.text,
      action: body.action as any,
      tenantId,
    });
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Sterling AI financial advisor' })
  chat(
    @Body() body: { messages: Array<{ role: 'user' | 'assistant'; content: string }> },
    @CurrentTenant() tenantId: string,
  ) {
    return this.aiService.chat({ messages: body.messages, tenantId });
  }
}
