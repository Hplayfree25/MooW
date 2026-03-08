import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const chats = pgTable('chats', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    characterId: text('character_id').notNull(),
    summary: text('summary'),
    chatMemory: text('chat_memory'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
    id: text('id').primaryKey(),
    chatId: text('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    versions: jsonb('versions').$type<any[]>().default([]),
    activeVersionIndex: integer('active_version_index').default(0),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const memories = pgTable('memories', {
    id: text('id').primaryKey(),
    characterId: text('character_id').notNull(),
    keyword: text('keyword').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
