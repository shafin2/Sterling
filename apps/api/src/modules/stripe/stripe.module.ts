import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
