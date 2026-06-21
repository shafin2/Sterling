import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AiInsightsService } from './ai-insights.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AiInsightsService],
})
export class AnalyticsModule {}
