import { integer, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { Priority } from '../enums/index.js';
import { users } from '../tables/index.js';
import { BaseFields } from '../helpers/index.js';

export const tasks = pgTable('tasks', {
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    priority: Priority('priority').default('Low'),
    userId: integer('userId').notNull().references(() => users.id),
    ...BaseFields
});
