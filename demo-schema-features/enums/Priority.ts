import { pgEnum } from 'drizzle-orm/pg-core';

export const Priority = pgEnum('priority', ['Low', 'High'] as const);
