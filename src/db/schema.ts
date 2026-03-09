import { sqliteTable, text, integer, primaryKey, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = sqliteTable("user", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: text("name").unique(),
    name: text("username"),
    email: text("email").unique(),
    emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
    password: text("password"),
    image: text("image"),
    bannerUrl: text("banner_url"),
    aboutMe: text("about_me"),
    shortBio: text("short_bio"),
    pinnedCharacterId: text("pinned_character_id"),
    appearance: text("appearance"),
});

export const accounts = sqliteTable(
    "account",
    {
        userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
    })
);

export const sessions = sqliteTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

export const characters = sqliteTable('characters', {
    id: text('id').primaryKey(),
    imageUrl: text('image_url').notNull(),
    characterName: text('character_name').notNull(),
    characterChatName: text('character_chat_name').notNull(),
    characterBio: text('character_bio').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
    publishSettings: text('publish_settings').notNull(),
    contentRating: text('content_rating').notNull().default('Limited'),
    personality: text('personality').notNull(),
    scenario: text('scenario').notNull(),
    firstMessages: text('first_messages', { mode: 'json' }).$type<string[]>().notNull(),
    exampleDialogue: text('example_dialogue').notNull(),
    creatorNotes: text('creator_notes').default(''),
    creatorId: text('creator_id'),
    likesCount: integer('likes_count').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});


export const characterComments = sqliteTable('character_comments', {
    id: text('id').primaryKey(),
    characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    parentId: text('parent_id'),
    userName: text('user_name').notNull(),
    content: text('content').notNull(),
    likesCount: integer('likes_count').default(0),
    laughCount: integer('laugh_count').default(0),
    coolCount: integer('cool_count').default(0),
    thumbsUpCount: integer('thumbs_up_count').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const commentReactions = sqliteTable('comment_reactions', {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    commentId: text('comment_id').notNull().references(() => characterComments.id, { onDelete: 'cascade' }),
    reactionType: text('reaction_type').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.commentId] }),
}));

export const characterLikes = sqliteTable('character_likes', {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.characterId] }),
}));

export const userSettings = sqliteTable('user_settings', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    nsfwEnabled: integer('nsfw_enabled', { mode: 'boolean' }).notNull().default(false),
    newCommentNotification: integer('new_comment_notification', { mode: 'boolean' }).notNull().default(true),
    newReplyNotification: integer('new_reply_notification', { mode: 'boolean' }).notNull().default(true),
    commentPinnedNotification: integer('comment_pinned_notification', { mode: 'boolean' }).notNull().default(true),
    newCharacterNotification: integer('new_character_notification', { mode: 'boolean' }).notNull().default(true),
    characterUpdatedNotification: integer('character_updated_notification', { mode: 'boolean' }).notNull().default(true),
    communityPollNotification: integer('community_poll_notification', { mode: 'boolean' }).notNull().default(true),
    newFollowerNotification: integer('new_follower_notification', { mode: 'boolean' }).notNull().default(true),
    characterFavoritedNotification: integer('character_favorited_notification', { mode: 'boolean' }).notNull().default(true),
    commentLikedNotification: integer('comment_liked_notification', { mode: 'boolean' }).notNull().default(true),
    replyLikedNotification: integer('reply_liked_notification', { mode: 'boolean' }).notNull().default(true),
});

export const userApiConfigurations = sqliteTable('user_api_configurations', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    configName: text('config_name').notNull(),
    modelName: text('model_name').notNull(),
    modelList: text('model_list'),
    apiUrl: text('api_url').notNull(),
    apiKey: text('api_key').notNull(),
    apiFormat: text('api_format').notNull().default('openai'),
    promptProcessing: text('prompt_processing').notNull().default('none'),
    customPrompt: text('custom_prompt'),
    temperature: real('temperature').default(0.8),
    maxTokens: integer('max_tokens', { mode: 'number' }).default(2048),
    contextSize: integer('context_size', { mode: 'number' }).default(4096),
    topP: real('top_p').default(1.0),
    topK: integer('top_k', { mode: 'number' }).default(0),
    repPenalty: real('rep_penalty').default(1.0),
    freqPenalty: real('freq_penalty').default(0.0),
    forbiddenWords: text('forbidden_words'),
    responsePrefill: text('response_prefill'),
    usePrefill: integer('use_prefill', { mode: 'boolean' }).default(false),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const mediaFolders = sqliteTable('media_folders', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    folderName: text('folder_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const mediaFiles = sqliteTable('media_files', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => mediaFolders.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    filename: text('filename').notNull(),
    size: integer('size').default(0),
    format: text('format').default('unknown'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const follows = sqliteTable('follows', {
    followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    compoundKey: primaryKey({ columns: [table.followerId, table.followingId] }),
}));

export const userBadges = sqliteTable('user_badges', {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    badgeId: integer('badge_id').notNull(),
    awardedAt: integer('awarded_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.badgeId] }),
}));

