import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../auth/auth.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }
    return true;
  }
}
