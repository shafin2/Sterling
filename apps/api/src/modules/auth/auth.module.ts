import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { QUEUE_EMAIL } from '../queues/queues.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        ({
          secret: config.get<string>('JWT_ACCESS_SECRET') ?? '',
          signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m' },
        }) as object,
    }),
    // Register the email queue so AuthService can enqueue welcome + reset emails
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
