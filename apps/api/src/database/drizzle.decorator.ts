import { Inject } from '@nestjs/common';
import { DATABASE_TOKEN } from './database.module';

export const InjectDrizzle = () => Inject(DATABASE_TOKEN);
