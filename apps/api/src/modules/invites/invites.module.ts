import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { QUEUE_EMAIL } from '../queues/queues.module';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
