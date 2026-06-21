import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
  ) {}

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, passwordResetToken, ...safe } = user;
    void passwordHash;
    void passwordResetToken;
    return safe;
  }

  async getTenantMembers(tenantId: string) {
    return this.db.query.memberships.findMany({
      where: eq(schema.memberships.tenantId, tenantId),
    });
  }
}
