import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../database/schema/memberships';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...roles: Role[]) => SetMetadata(PERMISSIONS_KEY, roles);
