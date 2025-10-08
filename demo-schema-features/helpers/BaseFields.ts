import { serial, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const BaseFields = {
    id: serial('id').primaryKey(),
    createdAt: timestamp('createdAt').notNull().default(sql`now()`),
    updatedAt: timestamp('updatedAt').notNull().default(sql`now()`)
};
