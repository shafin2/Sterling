import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StreamService } from './stream.service';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('Stream Chat')
@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @ApiBearerAuth()
  @Get('token')
  @ApiOperation({ summary: 'Get Stream Chat token for authenticated user' })
  async getToken(@CurrentUser() user: JwtPayload) {
    const name = user.email;
    const [tokenData, channelData] = await Promise.all([
      this.streamService.getUserToken(user.sub, name, user.email, user.role ?? 'user'),
      this.streamService.getOrCreateSupportChannel(user.sub, name),
    ]);
    return { ...tokenData, channelId: channelData.channelId };
  }

  @Public()
  @Get('guest-token')
  @ApiOperation({ summary: 'Get anonymous guest Stream Chat token' })
  getGuestToken() {
    return this.streamService.getGuestToken();
  }

  @ApiBearerAuth()
  @Get('support-channels')
  @ApiOperation({ summary: 'List all support channels (admin)' })
  getSupportChannels() {
    return this.streamService.getSupportChannels();
  }
}
