"use server";

import { auth } from "@/auth";
import { db, dbChat } from "@/db";
import { characters, characterComments, commentReactions, users, characterLikes, follows, userBadges } from "@/db/schema";
import { chats } from "@/db/schema.logs";
import { desc, eq, sql, getTableColumns, and, inArray } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { redis, CACHE_KEYS, getCachedData, setCachedData, incrementBuffer } from "@/lib/redis";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function createCharacterAction(formData: any) {
    try {
        const session = await auth();
        let creatorId = "system";
        if (session?.user?.id) {
            const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
            if (user?.username) {
                creatorId = user.username;
            }
        }

        const id = crypto.randomUUID();

        let finalImageUrl = formData.imageUrl || "";

        if (finalImageUrl.startsWith("data:image")) {
            if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
                try {
                    const uploadResponse = await cloudinary.uploader.upload(finalImageUrl, {
                        folder: "messager_avatars",
                    });
                    finalImageUrl = uploadResponse.secure_url;
                } catch (uploadError) {
                    console.error("Cloudinary upload failed:", uploadError);
                }
            } else {
                console.warn("Cloudinary credentials missing, saving base64 to DB directly.");
            }
        }

        await db.insert(characters).values({
            id,
            imageUrl: finalImageUrl,
            characterName: formData.characterName || "New Character",
            characterChatName: formData.characterChatName || formData.characterName || "New Character",
            characterBio: formData.characterBio || "",
            tags: formData.tags || [],
            publishSettings: formData.publishSettings || "Private",
            contentRating: formData.contentRating || "Limited",
            personality: formData.personality || "",
            scenario: formData.scenario || "",
            firstMessages: formData.firstMessages || [],
            exampleDialogue: formData.exampleDialogue || "",
            creatorNotes: formData.creatorNotes || "",
            creatorId: creatorId,
        });

        return { success: true, id };
    } catch (error: any) {
        console.error("Failed to create character:", error);
        return { success: false, error: error?.message || String(error) || "Failed to create character" };
    }
}

export async function getCharactersAction(limit: number = 15, offset: number = 0) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const chars = await db.select({
            ...getTableColumns(characters),
            hasLiked: userId
                ? sql<boolean>`CASE WHEN MAX(CASE WHEN ${characterLikes.userId} = ${userId} THEN 1 ELSE 0 END) = 1 THEN 1 ELSE 0 END`
                : sql<boolean>`0`,
            dbLikesCount: sql<number>`count(distinct ${characterLikes.userId})`.mapWith(Number)
        })
            .from(characters)
            .leftJoin(characterLikes, eq(characterLikes.characterId, characters.id))
            .groupBy(characters.id)
            .orderBy(desc(characters.createdAt))
            .limit(limit)
            .offset(offset);

        if (chars.length > 0) {
            const charIds = chars.map(c => c.id);
            const chatCounts = await dbChat.select({
                characterId: chats.characterId,
                count: sql<number>`count(distinct ${chats.id})`
            })
                .from(chats)
                .where(inArray(chats.characterId, charIds))
                .groupBy(chats.characterId);

            const countMap = new Map();
            chatCounts.forEach(c => countMap.set(c.characterId, c.count));

            const enrichedChars = chars.map(c => ({
                ...c,
                chatCount: countMap.get(c.id) || 0,
                likesCount: (c.likesCount || 0) + c.dbLikesCount
            }));

            return { success: true, data: enrichedChars };
        }

        return { success: true, data: chars.map(c => ({ ...c, chatCount: 0 })) };
    } catch (error) {
        console.error("Failed to fetch characters:", error);
        return { success: false, error: "Failed to fetch characters" };
    }
}

export async function getCharacterByIdAction(id: string) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const cacheKey = CACHE_KEYS.CHARACTER_DATA(id);
        const cachedChar = await getCachedData<{ success: boolean; data: any; comments: any[] }>(cacheKey);

        if (cachedChar) {
            let hasLiked = false;
            let isOwner = false;
            if (userId) {
                const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
                const [like] = await db.select()
                    .from(characterLikes)
                    .where(and(eq(characterLikes.userId, userId), eq(characterLikes.characterId, id)))
                    .limit(1);
                hasLiked = !!like;
                isOwner = cachedChar.data.creatorId === user?.username;
            }

            const bufferedLikesStr = await redis.get(CACHE_KEYS.CHARACTER_LIKES_BUFFER(id));
            const bufferedLikes = bufferedLikesStr ? parseInt(bufferedLikesStr as string, 10) : 0;
            cachedChar.data.likesCount = (cachedChar.data.likesCount || 0) + bufferedLikes;

            return { ...cachedChar, data: { ...cachedChar.data, hasLiked, isOwner } };
        }

        const char = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
        if (!char || char.length === 0) {
            return { success: false, error: "Character not found" };
        }

        let hasLiked = false;
        let isOwner = false;
        let isCurrentUserStaff = false;
        if (userId) {
            const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            isOwner = char[0].creatorId === user?.username;

            const [staffBadge] = await db.select().from(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, 2))).limit(1);
            isCurrentUserStaff = !!staffBadge;

            const [like] = await db.select()
                .from(characterLikes)
                .where(and(eq(characterLikes.userId, userId), eq(characterLikes.characterId, id)))
                .limit(1);
            hasLiked = !!like;
        }

        const rawComments = await db.select({
            comment: characterComments,
            userImage: users.image,
            userName: users.username,
            reactionType: userId ? sql`MAX(CASE WHEN ${commentReactions.userId} = ${userId} THEN ${commentReactions.reactionType} ELSE NULL END)` : sql`NULL`
        })
            .from(characterComments)
            .leftJoin(users, eq(characterComments.userId, users.id))
            .leftJoin(commentReactions, eq(characterComments.id, commentReactions.commentId))
            .where(eq(characterComments.characterId, id))
            .groupBy(characterComments.id)
            .orderBy(desc(characterComments.createdAt));

        const commentIds = rawComments.map((r: any) => r.comment.id);
        const allReactions = commentIds.length > 0 ? await db.select()
            .from(commentReactions)
            .where(inArray(commentReactions.commentId, commentIds)) : [];

        const reactionMap: Record<string, Record<string, number>> = {};
        const userReactionMap: Record<string, string | null> = {};

        for (const reaction of allReactions) {
            if (!reactionMap[reaction.commentId]) reactionMap[reaction.commentId] = {};
            reactionMap[reaction.commentId][reaction.reactionType] = (reactionMap[reaction.commentId][reaction.reactionType] || 0) + 1;

            if (userId && reaction.userId === userId) {
                userReactionMap[reaction.commentId] = reaction.reactionType;
            }
        }

        const allUserIds = [...new Set(rawComments.map((r: any) => r.comment.userId).filter(Boolean))];
        const userBadgesData = allUserIds.length > 0
            ? await db.select().from(userBadges).where(inArray(userBadges.userId, allUserIds as string[]))
            : [];

        const badgesMap: Record<string, number[]> = {};
        for (const ub of userBadgesData) {
            if (!badgesMap[ub.userId]) badgesMap[ub.userId] = [];
            badgesMap[ub.userId].push(ub.badgeId);
        }

        const comments = rawComments.map((row: any) => {
            const commentReactionsObj = reactionMap[row.comment.id] || {};
            const sortedReactions = Object.entries(commentReactionsObj)
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => (b.count as number) - (a.count as number));

            const commentUserBadges = row.comment.userId ? (badgesMap[row.comment.userId] || []) : [];

            return {
                ...row.comment,
                userName: row.userName || "Anonymous",
                userImageUrl: row.userImage,
                userReaction: userReactionMap[row.comment.id] || null,
                reactions: sortedReactions,
                isStaff: commentUserBadges.includes(2),
                isVerified: commentUserBadges.includes(3)
            };
        });

        const resultBase = { success: true, data: { ...char[0] }, comments };

        await setCachedData(cacheKey, resultBase, 300);

        const bufferedLikesStr = await redis.get(CACHE_KEYS.CHARACTER_LIKES_BUFFER(id));
        const bufferedLikes = bufferedLikesStr ? parseInt(bufferedLikesStr as string, 10) : 0;

        return { success: true, data: { ...char[0], hasLiked, isOwner, isCurrentUserStaff, currentUserId: userId, likesCount: (char[0].likesCount || 0) + bufferedLikes }, comments };
    } catch (error) {
        console.error("Failed to fetch character details:", error);
        return { success: false, error: "Failed to fetch character details" };
    }
}

export async function likeCharacterAction(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        await db.insert(characterLikes).values({
            userId: session.user.id,
            characterId: id
        });

        await incrementBuffer(CACHE_KEYS.CHARACTER_LIKES_BUFFER(id), 1);

        return { success: true };
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.message?.includes('UNIQUE')) {
            return { success: false, error: "Already liked this character" };
        }
        console.error("Failed to like character:", error);
        return { success: false, error: "Failed to like character" };
    }
}

export async function unlikeCharacterAction(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const result = await db.delete(characterLikes)
            .where(and(eq(characterLikes.userId, session.user.id), eq(characterLikes.characterId, id)))
            .returning();

        if (result.length > 0) {
            await incrementBuffer(CACHE_KEYS.CHARACTER_LIKES_BUFFER(id), -1);
        }
        return { success: true };
    } catch (error) {
        console.error("Failed to unlike character:", error);
        return { success: false, error: "Failed to unlike character" };
    }
}

export async function addCommentAction(characterId: string, content: string, parentId?: string) {
    if (!content.trim()) return { success: false, error: "Empty comment" };
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        const resolvedName = user?.username || "Anonymous User";

        const id = crypto.randomUUID();
        await db.insert(characterComments).values({
            id,
            characterId,
            userId: session.user.id,
            parentId: parentId || null,
            userName: resolvedName,
            content
        });

        const cacheKey = CACHE_KEYS.CHARACTER_DATA(characterId);
        await redis.del(cacheKey);

        return { success: true, id, userName: resolvedName, userImageUrl: user?.image };
    } catch (error) {
        console.error("Failed to add comment:", error);
        return { success: false, error: "Failed to add comment" };
    }
}

export async function toggleCommentReactionAction(commentId: string, reactionType: string, isAdding: boolean) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };
        const userId = session.user.id;

        if (isAdding) {
            const existing = await db.select().from(commentReactions)
                .where(and(eq(commentReactions.userId, userId), eq(commentReactions.commentId, commentId)))
                .limit(1);

            if (existing && existing.length > 0) {
                const oldType = existing[0].reactionType;
                if (oldType === reactionType) return { success: true };

                await db.update(commentReactions).set({ reactionType }).where(and(eq(commentReactions.userId, userId), eq(commentReactions.commentId, commentId)));
            } else {
                await db.insert(commentReactions).values({ userId, commentId, reactionType });
            }
        } else {
            await db.delete(commentReactions)
                .where(and(eq(commentReactions.userId, userId), eq(commentReactions.commentId, commentId)));
        }

        const charComment = await db.select({ characterId: characterComments.characterId }).from(characterComments).where(eq(characterComments.id, commentId)).limit(1);
        if (charComment.length > 0) {
            const cacheKey = CACHE_KEYS.CHARACTER_DATA(charComment[0].characterId);
            await redis.del(cacheKey);
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to toggle reaction:", error);
        return { success: false, error: "Failed to toggle reaction" };
    }
}

export async function deleteCharacterAction(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        if (!user || !user.username) return { success: false, error: "User not found" };

        const [char] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
        if (!char) return { success: false, error: "Character not found" };

        const [isStaff] = await db.select().from(userBadges).where(and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, 2))).limit(1);

        if (char.creatorId !== user.username && !isStaff) {
            return { success: false, error: "Unauthorized" };
        }

        await db.delete(characters).where(eq(characters.id, id));

        const cacheKey = CACHE_KEYS.CHARACTER_DATA(id);
        await redis.del(cacheKey);

        return { success: true };
    } catch (error) {
        console.error("Failed to delete character:", error);
        return { success: false, error: "Failed to delete character" };
    }
}

export async function updateCharacterAction(id: string, formData: any) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        if (!user || !user.username) return { success: false, error: "User not found" };

        const [char] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
        if (!char) return { success: false, error: "Character not found" };

        if (char.creatorId !== user.username) {
            return { success: false, error: "Unauthorized" };
        }

        let finalImageUrl = formData.imageUrl || char.imageUrl;

        if (finalImageUrl.startsWith("data:image")) {
            if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
                try {
                    const uploadResponse = await cloudinary.uploader.upload(finalImageUrl, {
                        folder: "messager_avatars",
                    });
                    finalImageUrl = uploadResponse.secure_url;
                } catch (uploadError) {
                    console.error("Cloudinary upload failed:", uploadError);
                }
            } else {
                console.warn("Cloudinary credentials missing, saving base64 to DB directly.");
            }
        }

        await db.update(characters).set({
            imageUrl: finalImageUrl,
            characterName: formData.characterName || char.characterName,
            characterChatName: formData.characterChatName || formData.characterName || char.characterChatName,
            characterBio: formData.characterBio || "",
            tags: formData.tags || [],
            publishSettings: formData.publishSettings || "Private",
            contentRating: formData.contentRating || "Limited",
            personality: formData.personality || "",
            scenario: formData.scenario || "",
            firstMessages: formData.firstMessages || [],
            exampleDialogue: formData.exampleDialogue || "",
            creatorNotes: formData.creatorNotes || "",
            updatedAt: new Date()
        }).where(eq(characters.id, id));

        const cacheKey = CACHE_KEYS.CHARACTER_DATA(id);
        await redis.del(cacheKey);

        return { success: true };
    } catch (error: any) {
        console.error("Failed to update character:", error);
        return { success: false, error: error?.message || String(error) || "Failed to update character" };
    }
}

export async function toggleFollowAction(targetUserId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const currentUserId = session.user.id;
        if (currentUserId === targetUserId) return { success: false, error: "You cannot follow yourself" };

        const existingFollow = await db.select()
            .from(follows)
            .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId)))
            .limit(1);

        if (existingFollow && existingFollow.length > 0) {
            await db.delete(follows)
                .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId)));
            return { success: true, isFollowing: false };
        } else {
            await db.insert(follows).values({
                followerId: currentUserId,
                followingId: targetUserId
            });
            return { success: true, isFollowing: true };
        }
    } catch (error) {
        console.error("Failed to toggle follow status:", error);
        return { success: false, error: "An error occurred" };
    }
}

export async function deleteCommentAction(commentId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        if (!user) return { success: false, error: "User not found" };

        const [comment] = await db.select().from(characterComments).where(eq(characterComments.id, commentId)).limit(1);
        if (!comment) return { success: false, error: "Comment not found" };

        const [isStaff] = await db.select().from(userBadges).where(and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, 2))).limit(1);

        if (comment.userId !== user.id && !isStaff) {
            return { success: false, error: "Unauthorized" };
        }

        await db.delete(characterComments).where(eq(characterComments.id, commentId));

        const cacheKey = CACHE_KEYS.CHARACTER_DATA(comment.characterId);
        await redis.del(cacheKey);

        return { success: true };
    } catch (error) {
        console.error("Failed to delete comment:", error);
        return { success: false, error: "Failed to delete comment" };
    }
}

export async function banUserAction(username: string, value: boolean) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [isStaff] = await db.select().from(userBadges).where(and(eq(userBadges.userId, session.user.id), eq(userBadges.badgeId, 2))).limit(1);
        if (!isStaff) return { success: false, error: "Unauthorized" };

        const [targetUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (!targetUser) return { success: false, error: "Target user not found" };

        await db.update(users).set({ isBanned: value }).where(eq(users.id, targetUser.id));

        return { success: true };
    } catch (error) {
        console.error("Failed to ban user:", error);
        return { success: false, error: "An error occurred" };
    }
}

export async function grantBadgeAction(username: string, badgeId: number, revoke: boolean = false) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [isStaff] = await db.select().from(userBadges).where(and(eq(userBadges.userId, session.user.id), eq(userBadges.badgeId, 2))).limit(1);
        if (!isStaff) return { success: false, error: "Unauthorized" };

        const [targetUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (!targetUser) return { success: false, error: "Target user not found" };

        if (revoke) {
            await db.delete(userBadges).where(and(eq(userBadges.userId, targetUser.id), eq(userBadges.badgeId, badgeId)));
        } else {
            // Use explicit insert to avoid IGNORE on sqlite directly returning array error, or check existing
            const [existing] = await db.select().from(userBadges).where(and(eq(userBadges.userId, targetUser.id), eq(userBadges.badgeId, badgeId))).limit(1);
            if (!existing) {
                await db.insert(userBadges).values({ userId: targetUser.id, badgeId });
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to grant/revoke badge:", error);
        return { success: false, error: "An error occurred" };
    }
}

export async function toggleBadgeDisplayAction(badgeId: number, isDisplayed: boolean) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        if (!user) return { success: false, error: "User not found" };

        if (isDisplayed) {
            const currentDisplayed = await db.select()
                .from(userBadges)
                .where(and(eq(userBadges.userId, user.id), eq(userBadges.isDisplayed, true)));

            if (currentDisplayed.length >= 3) {
                return { success: false, error: "You can only display up to 3 badges at maximum on your profile." };
            }
        }

        const [existing] = await db.select().from(userBadges).where(and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, badgeId))).limit(1);
        if (!existing) {
            return { success: false, error: "You do not own this badge" };
        }

        await db.update(userBadges).set({ isDisplayed }).where(and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, badgeId)));
        return { success: true, isDisplayed };
    } catch (error) {
        console.error("Failed to toggle badge display:", error);
        return { success: false, error: "An error occurred" };
    }
}
