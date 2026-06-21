import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL: `${config.get<string>('API_URL') ?? 'http://localhost:4000'}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails: Array<{ value: string }>;
      displayName: string;
      photos: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0]?.value ?? '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const avatar = photos?.[0]?.value ?? null;

    const user = await this.authService.findOrCreateGoogleUser({
      googleId: id,
      email,
      firstName,
      lastName,
      avatar,
    });

    done(null, user);
  }
}
