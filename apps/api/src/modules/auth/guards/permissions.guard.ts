import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import type { Role } from '../../../database/schema/memberships';
import type { JwtPayload } from '../auth.service';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  accountant: 3,
  hr: 2,
  viewer: 1,
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Permissions() decorator — allow through
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const userRole = request.user?.role as Role | undefined;

    // No user on request means the JwtAuthGuard did not authenticate (public route
    // with a @Permissions() decorator — treat as forbidden, not a crash)
    if (!userRole) throw new ForbiddenException('Insufficient permissions');

    const hasPermission = requiredRoles.some(
      (required) => (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[required] ?? 0),
    );

    if (!hasPermission) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
