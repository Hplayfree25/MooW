jest.mock('@/db', () => ({
    db: {
        insert: jest.fn().mockReturnThis(), // Pokoknya balikin 'this' biar bisa di-chaining
        values: jest.fn().mockResolvedValue({}),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
    }
}));

jest.mock('@/db/schema', () => ({
    characters: {},
    characterComments: {},
    chats: {},
}));

jest.mock('drizzle-orm', () => ({
    desc: jest.fn(),
    eq: jest.fn(),
    sql: jest.fn(),
    getTableColumns: jest.fn().mockReturnValue({}),
}));

jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: { upload: jest.fn() },
    },
}));

import { addCommentAction } from '@/app/(main)/actions';

describe('Actions Unit Tests', () => {
    describe('addCommentAction', () => {
        // Ngetes skenario kalau userny males ngetik
        it('returns an error if content is empty', async () => {
            const result = await addCommentAction('char-1', 'User', '   ');
            expect(result.success).toBe(false);
            expect(result.error).toBe("Empty comment or username");
        });

        // Ngetes skenario anonim
        it('returns an error if username is empty', async () => {
            const result = await addCommentAction('char-1', '   ', 'Great char!');
            expect(result.success).toBe(false);
            expect(result.error).toBe("Empty comment or username");
        });

        it('returns success and an id if valid', async () => {
            const result = await addCommentAction('char-1', 'User', 'Great char!');
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('id');
        });
    });
});
