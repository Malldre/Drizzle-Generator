import { pgEnum } from 'drizzle-orm/pg-core';

export const UserStatus = pgEnum('user_status', ['Active', 'Inactive', 'Pending'] as const);
