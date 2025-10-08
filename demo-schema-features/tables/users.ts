import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { UserStatus } from '../enums/index.js';
import { BaseFields } from '../helpers/index.js';

export const users = pgTable('users', {
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    status: UserStatus('status').default('Active'),
    ...BaseFields
});
