/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private readonly client: StreamChat | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('STREAM_API_KEY');
    const apiSecret = config.get<string>('STREAM_API_SECRET');
    if (apiKey && apiSecret) {
      this.client = StreamChat.getInstance(apiKey, apiSecret);
    }
  }

  async getUserToken(
    userId: string,
    name: string,
    email: string,
    role: string,
  ): Promise<{ token: string; apiKey: string; userId: string }> {
    if (!this.client) {
      return { token: '', apiKey: '', userId };
    }
    await this.client.upsertUser({
      id: userId,
      name,
      role: role === 'owner' || role === 'admin' ? 'admin' : 'user',
      ...(email ? { email } : {}),
    } as any);
    const token = this.client.createToken(userId);
    return { token, apiKey: this.config.get('STREAM_API_KEY')!, userId };
  }

  async getGuestToken(): Promise<{ token: string; apiKey: string; userId: string }> {
    if (!this.client) {
      return { token: '', apiKey: '', userId: '' };
    }
    const guestId = `guest_${Date.now()}`;
    await this.client.upsertUser({ id: guestId, name: 'Visitor' } as any);
    const token = this.client.createToken(guestId);
    return { token, apiKey: this.config.get('STREAM_API_KEY')!, userId: guestId };
  }

  async getSupportChannels() {
    if (!this.client) return [];
    try {
      const channels = await this.client.queryChannels(
        { type: 'messaging' } as any,
        [{ last_message_at: -1 }] as any,
        { limit: 50 },
      );
      return channels.map((ch) => ({
        id: ch.id,
        name: (ch.data as any)?.name ?? 'Support Chat',
        lastMessage: ch.lastMessage()?.text ?? '',
        lastMessageAt: (ch.data as any)?.last_message_at ?? null,
        memberCount: Object.keys(ch.state.members).length,
      }));
    } catch (err) {
      this.logger.warn('getSupportChannels failed', err);
      return [];
    }
  }

  async getOrCreateSupportChannel(
    userId: string,
    userName: string,
  ): Promise<{ channelId: string }> {
    if (!this.client) return { channelId: `support_${userId}` };
    const channelId = `support_${userId}`;
    const channel = this.client.channel('messaging', channelId, {
      created_by_id: userId,
      members: [userId],
      ...({ name: `Support — ${userName}`, custom_type: 'support' } as any),
    });
    await channel.create();
    return { channelId };
  }
}
