import React from "react";
import { users, follows, userBadges, characters, characterLikes } from "@/db/schema";
import { chats } from "@/db/schema.logs";
import { db, dbChat } from "@/db";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import ClientProfile from "../ClientProfile";
import { redirect } from "next/navigation";
import { getBadgeConfig } from "@/config/badges";

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
    const params = await props.params;
    const session = await auth();
    const decodedUsername = decodeURIComponent(params.username);

    const [user] = await db.select().from(users).where(eq(users.username, decodedUsername)).limit(1);
    if (!user) redirect("/");

    let isFollowing = false;
    if (session?.user?.id) {
        const [followCheck] = await db.select()
            .from(follows)
            .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, user.id)))
            .limit(1);
        isFollowing = !!followCheck;
    }

    const [followersRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
        .from(follows)
        .where(eq(follows.followingId, user.id));

    const userBadgesRows = await db.select({
        badgeId: userBadges.badgeId,
        isDisplayed: userBadges.isDisplayed
    })
        .from(userBadges)
        .where(eq(userBadges.userId, user.id));

    let userBadgesList = userBadgesRows
        .map(row => {
            const config = getBadgeConfig(row.badgeId);
            if (config) return { ...config, isDisplayed: row.isDisplayed };
            return undefined;
        })
        .filter((b): b is NonNullable<typeof b> => b !== undefined);

    if (userBadgesList.length === 0) {
        try {
            await db.insert(userBadges).values({
                userId: user.id,
                badgeId: 1
            });
            const badgeConfig = getBadgeConfig(1);
            if (badgeConfig) userBadgesList.push({ ...badgeConfig, isDisplayed: false });
        } catch {
            const badgeConfig = getBadgeConfig(1);
            if (badgeConfig) userBadgesList.push({ ...badgeConfig, isDisplayed: false });
        }
    }

    const joinedDate = user.emailVerified ? new Date(user.emailVerified) : new Date();

    const profileData = {
        name: user.name || user.username || `user_${user.id.substring(0, 6)}`,
        username: user.username || `user_${user.id.substring(0, 6)}`,
        handle: user.username || `user_${user.id.substring(0, 6)}`,
        avatarUrl: user.image || "https://api.dicebear.com/7.x/notionists/svg?seed=fallback",
        bannerUrl: user.bannerUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop",
        isVerified: userBadgesList.some(b => b.id === 3),
        isStaff: userBadgesList.some(b => b.id === 2),
        followersCount: followersRes?.count || 0,
        joinedAt: joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        bio: user.shortBio || "This user is way too lazy to set up their bio... what a slacker. 😎",
        isOwner: user.id === session?.user?.id,
        id: user.id,
        isFollowing,
        pinnedCharacterId: user.pinnedCharacterId,
        aboutMe: user.aboutMe || ""
    };

    const rawCharacters = await db.select({
        id: characters.id,
        characterName: characters.characterName,
        imageUrl: characters.imageUrl,
        characterBio: characters.characterBio,
        creatorNotes: characters.creatorNotes,
        tags: characters.tags,
        likesCount: characters.likesCount,
        creatorId: characters.creatorId,
        dbLikesCount: sql<number>`count(distinct ${characterLikes.userId})`.mapWith(Number),
        hasLiked: session?.user?.id
            ? sql<boolean>`CASE WHEN MAX(CASE WHEN ${characterLikes.userId} = ${session.user.id} THEN 1 ELSE 0 END) = 1 THEN 1 ELSE 0 END`
            : sql<boolean>`0`
    })
        .from(characters)
        .leftJoin(characterLikes, eq(characterLikes.characterId, characters.id))
        .where(eq(characters.creatorId, user.username || user.id))
        .groupBy(characters.id)
        .orderBy(desc(characters.createdAt));

    let countMap = new Map();
    if (rawCharacters.length > 0) {
        const charIds = rawCharacters.map(c => c.id);
        const chatCounts = await dbChat.select({
            characterId: chats.characterId,
            count: sql<number>`count(distinct ${chats.id})`
        })
            .from(chats)
            .where(inArray(chats.characterId, charIds))
            .groupBy(chats.characterId);

        chatCounts.forEach(c => countMap.set(c.characterId, c.count));
    }

    const userCharacters = rawCharacters.map(char => ({
        ...char,
        likesCount: (char.likesCount || 0) + char.dbLikesCount,
        chatCount: countMap.get(char.id) || 0,
        creatorId: char.creatorId || user.username || "Anonymous",
        tags: char.tags || []
    }));

    return <ClientProfile user={profileData} badges={userBadgesList} characters={userCharacters} />;
}
