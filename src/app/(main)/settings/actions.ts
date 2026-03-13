"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, characters, characterComments, userSettings, userApiConfigurations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

function extractCloudinaryPublicId(url: string): string | null {
    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.*?)(?:\.[a-zA-Z]+)?$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

export async function updateProfileAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "You must be logged in.", success: false };
        }

        const username = formData.get("username") as string;
        const name = formData.get("name") as string;
        const aboutMe = formData.get("aboutMe") as string;
        const appearance = formData.get("appearance") as string;

        if (!username) {
            return { error: "Username is required.", success: false };
        }

        if (name && !/^[a-zA-Z0-9_ ]{1,44}$/.test(name)) {
            return { error: "Persona name must be 1-44 characters, letters, numbers, spaces and underscores only.", success: false };
        }

        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

        if (currentUser.username !== username) {
            const existingUsers = await db.select().from(users).where(eq(users.username, username));
            if (existingUsers.length > 0) {
                return { error: "Username is already taken.", success: false };
            }
        }

        const usernameChanged = currentUser.username !== username;

        await db.update(users)
            .set({ username, name, aboutMe, appearance })
            .where(eq(users.id, session.user.id));

        if (usernameChanged) {
            if (currentUser.username) {
                const createdChars = await db.select({ id: characters.id }).from(characters).where(eq(characters.creatorId, currentUser.username));
                const commentedChars = await db.select({ characterId: characterComments.characterId }).from(characterComments).where(eq(characterComments.userName, currentUser.username));

                await db.update(characters)
                    .set({ creatorId: username })
                    .where(eq(characters.creatorId, currentUser.username));

                await db.update(characterComments)
                    .set({ userName: username })
                    .where(eq(characterComments.userName, currentUser.username));

                try {
                    const { redis, CACHE_KEYS } = await import("@/lib/redis");
                    const charIdsToInvalidate = new Set([
                        ...createdChars.map((c: any) => c.id),
                        ...commentedChars.map((c: any) => c.characterId)
                    ]);
                    if (charIdsToInvalidate.size > 0) {
                        const keys = Array.from(charIdsToInvalidate).map(id => CACHE_KEYS.CHARACTER_DATA(id));
                        await redis.del(...keys);
                    }
                } catch (e) {
                    console.error("Failed to invalidate cache", e);
                }
            }
        }

        revalidatePath("/settings");
        revalidatePath("/explore");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update profile:", error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE')) {
            return { error: "Username already taken.", success: false };
        }
        return { error: "An unexpected error occurred building the profile.", success: false };
    }
}

export async function updateAvatarAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const imageFile = formData.get("image") as File;
        const cropDataStr = formData.get("cropData") as string;

        if (!imageFile || imageFile.size === 0) {
            return { error: "No image file provided.", success: false };
        }

        const { v2: cloudinary } = await import("cloudinary");
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const [base64Image, [currentUser]] = await Promise.all([
            imageFile.arrayBuffer().then(ab => {
                const buffer = Buffer.from(ab);
                return `data:${imageFile.type};base64,${buffer.toString('base64')}`;
            }),
            db.select({ image: users.image }).from(users).where(eq(users.id, session.user.id)).limit(1)
        ]);

        const oldImageUrl = currentUser?.image;

        let transformation: any[] = [];
        let formatExt: "gif" | undefined = undefined;

        if (cropDataStr) {
            try {
                const cropData = JSON.parse(cropDataStr);
                transformation = [
                    { x: Math.round(cropData.x), y: Math.round(cropData.y), width: Math.round(cropData.width), height: Math.round(cropData.height), crop: "crop" },
                    { width: 256, height: 256, crop: "fill", gravity: "center" }
                ];
                if (imageFile.type === "image/gif") formatExt = "gif";
            } catch (e) {
                console.error("Invalid crop data", e);
            }
        } else {
            transformation = [{ width: 256, height: 256, crop: "fill", gravity: "face" }];
        }

        const uploadResponse = await cloudinary.uploader.upload(base64Image, {
            folder: "avatars",
            resource_type: "auto",
            format: formatExt,
            transformation: transformation,
            quality: "auto"
        });

        const newImageUrl = uploadResponse.secure_url;

        const dbUpdatePromise = db.update(users)
            .set({ image: newImageUrl })
            .where(eq(users.id, session.user.id));

        const deleteOldPromise = oldImageUrl
            ? Promise.resolve().then(async () => {
                const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
                if (oldPublicId) {
                    try {
                        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image", invalidate: true });
                    } catch (delErr) {
                        console.warn("Failed to delete old avatar from Cloudinary:", delErr);
                    }
                }
            })
            : Promise.resolve();

        await Promise.all([dbUpdatePromise, deleteOldPromise]);

        revalidatePath("/settings");
        revalidatePath("/explore");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update avatar:", error);
        return { error: "Failed to upload avatar.", success: false };
    }
}

export async function updateBannerAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const imageFile = formData.get("image") as File;
        const cropDataStr = formData.get("cropData") as string;

        if (!imageFile || imageFile.size === 0) {
            return { error: "No image file provided.", success: false };
        }

        const { v2: cloudinary } = await import("cloudinary");
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const [base64Image, [currentUser]] = await Promise.all([
            imageFile.arrayBuffer().then(ab => {
                const buffer = Buffer.from(ab);
                return `data:${imageFile.type};base64,${buffer.toString('base64')}`;
            }),
            db.select({ bannerUrl: users.bannerUrl }).from(users).where(eq(users.id, session.user.id)).limit(1)
        ]);

        const oldImageUrl = currentUser?.bannerUrl;

        let transformation: any[] = [];
        let formatExt: "gif" | undefined = undefined;

        if (cropDataStr) {
            try {
                const cropData = JSON.parse(cropDataStr);
                transformation = [
                    { x: Math.round(cropData.x), y: Math.round(cropData.y), width: Math.round(cropData.width), height: Math.round(cropData.height), crop: "crop" },
                    { width: 1200, height: 400, crop: "fill", gravity: "center" }
                ];
                if (imageFile.type === "image/gif") formatExt = "gif";
            } catch (e) {
                console.error("Invalid crop data", e);
            }
        } else {
            transformation = [{ width: 1200, height: 400, crop: "fill", gravity: "center" }];
        }

        const uploadResponse = await cloudinary.uploader.upload(base64Image, {
            folder: "banners",
            resource_type: "auto",
            format: formatExt,
            transformation: transformation,
            quality: "auto"
        });

        const newImageUrl = uploadResponse.secure_url;

        const dbUpdatePromise = db.update(users)
            .set({ bannerUrl: newImageUrl })
            .where(eq(users.id, session.user.id));

        const deleteOldPromise = oldImageUrl
            ? Promise.resolve().then(async () => {
                const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
                if (oldPublicId) {
                    try {
                        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image", invalidate: true });
                    } catch (delErr) {
                        console.warn("Failed to delete old banner from Cloudinary:", delErr);
                    }
                }
            })
            : Promise.resolve();

        await Promise.all([dbUpdatePromise, deleteOldPromise]);

        revalidatePath("/profile");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update banner:", error);
        return { error: "Failed to upload banner.", success: false };
    }
}

export async function updateShortBioAction(shortBio: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        await db.update(users)
            .set({ shortBio })
            .where(eq(users.id, session.user.id));

        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to update short bio:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function pinCharacterAction(characterId: string | null) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        await db.update(users)
            .set({ pinnedCharacterId: characterId })
            .where(eq(users.id, session.user.id));

        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to pin character:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function deleteAvatarAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const [currentUser] = await db.select({ image: users.image }).from(users).where(eq(users.id, session.user.id)).limit(1);
        const oldImageUrl = currentUser?.image;

        const dbClearPromise = db.update(users)
            .set({ image: null })
            .where(eq(users.id, session.user.id));

        const cloudinaryDeletePromise = oldImageUrl
            ? Promise.resolve().then(async () => {
                const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
                if (oldPublicId) {
                    try {
                        const { v2: cloudinary } = await import("cloudinary");
                        cloudinary.config({
                            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
                            api_key: process.env.CLOUDINARY_API_KEY,
                            api_secret: process.env.CLOUDINARY_API_SECRET,
                        });
                        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "image", invalidate: true });
                    } catch (delErr) {
                        console.warn("Failed to delete old avatar from Cloudinary:", delErr);
                    }
                }
            })
            : Promise.resolve();

        await Promise.all([dbClearPromise, cloudinaryDeletePromise]);

        revalidatePath("/settings");
        revalidatePath("/explore");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete avatar:", error);
        return { error: "Failed to delete avatar.", success: false };
    }
}

export async function getMediaLibraryAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Not logged in", success: false };

        const { mediaFolders, mediaFiles } = await import('@/db/schema');

        const folders = await db.select().from(mediaFolders).where(eq(mediaFolders.userId, session.user.id)).orderBy(desc(mediaFolders.createdAt));
        const files = await db.select().from(mediaFiles).where(eq(mediaFiles.userId, session.user.id)).orderBy(desc(mediaFiles.createdAt));

        return { success: true, folders, files };
    } catch (error) {
        console.error(error);
        return { error: "Failed loading media", success: false };
    }
}

export async function createMediaFolderAction(folderName: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Not logged in", success: false };

        const { mediaFolders } = await import('@/db/schema');
        const [folder] = await db.insert(mediaFolders).values({
            userId: session.user.id,
            folderName: folderName
        }).returning();

        return { success: true, folder };
    } catch (error) {
        console.error(error);
        return { error: "Failed to create folder", success: false };
    }
}

export async function uploadMediaFileAction(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Not logged in", success: false };

        const imageFile = formData.get("file") as File;
        const folderIdStr = formData.get("folderId") as string;
        const folderId = folderIdStr === "root" ? null : folderIdStr;

        if (!imageFile || imageFile.size === 0) return { error: "No file provided", success: false };

        const { v2: cloudinary } = await import("cloudinary");
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

        const uploadResponse = await cloudinary.uploader.upload(base64Image, {
            folder: "media_library",
            resource_type: "auto",
            quality: "auto"
        });

        const { mediaFiles } = await import('@/db/schema');
        const [newFile] = await db.insert(mediaFiles).values({
            userId: session.user.id,
            folderId: folderId,
            url: uploadResponse.secure_url,
            filename: imageFile.name,
            size: imageFile.size,
            format: imageFile.type
        }).returning();

        return { success: true, file: newFile };
    } catch (error) {
        console.error(error);
        return { error: "Failed uploading file", success: false };
    }
}

export async function updatePrivacyAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const nsfwEnabled = formData.get("nsfwEnabled") === "on";
        const newPassword = formData.get("newPassword") as string;

        await db.update(userSettings)
            .set({ nsfwEnabled })
            .where(eq(userSettings.userId, session.user.id));

        if (newPassword && newPassword.trim().length > 0) {
            if (newPassword.length < 6) return { error: "Password must be at least 6 characters.", success: false };
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.update(users)
                .set({ password: hashedPassword })
                .where(eq(users.id, session.user.id));
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update privacy:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function updateNotificationAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const settingsData = {
            newCommentNotification: formData.get("newCommentNotification") === "on",
            newReplyNotification: formData.get("newReplyNotification") === "on",
            commentPinnedNotification: formData.get("commentPinnedNotification") === "on",
            newCharacterNotification: formData.get("newCharacterNotification") === "on",
            characterUpdatedNotification: formData.get("characterUpdatedNotification") === "on",
            communityPollNotification: formData.get("communityPollNotification") === "on",
            newFollowerNotification: formData.get("newFollowerNotification") === "on",
            characterFavoritedNotification: formData.get("characterFavoritedNotification") === "on",
            commentLikedNotification: formData.get("commentLikedNotification") === "on",
            replyLikedNotification: formData.get("replyLikedNotification") === "on",
        };

        await db.update(userSettings)
            .set(settingsData)
            .where(eq(userSettings.userId, session.user.id));

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update notifications:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function addApiAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const { encrypt } = await import("@/lib/crypto");

        const configName = formData.get("configName") as string;
        const modelName = formData.get("modelName") as string;
        const modelList = formData.get("modelList") as string;
        const apiUrl = formData.get("apiUrl") as string;
        const apiKey = formData.get("apiKey") as string;
        const apiFormat = (formData.get("apiFormat") as string) || "openai";
        const promptProcessing = (formData.get("promptProcessing") as string) || "none";
        const customPrompt = formData.get("customPrompt") as string;

        if (!configName || !modelName || !apiUrl || !apiKey) {
            return { error: "Please fill in all required fields.", success: false };
        }

        const encryptedKey = encrypt(apiKey);

        const existingConfigs = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, session.user.id));
        const isDefault = existingConfigs.length === 0;

        await db.insert(userApiConfigurations).values({
            userId: session.user.id,
            configName,
            modelName,
            modelList: modelList || null,
            apiUrl,
            apiKey: encryptedKey,
            apiFormat,
            promptProcessing,
            customPrompt: customPrompt || null,
            isDefault,
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to add API config:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function deleteApiAction(configId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const [config] = await db.select().from(userApiConfigurations)
            .where(eq(userApiConfigurations.id, configId)).limit(1);

        if (!config || config.userId !== session.user.id) {
            return { error: "Configuration not found or not yours.", success: false };
        }

        await db.delete(userApiConfigurations).where(eq(userApiConfigurations.id, configId));

        if (config.isDefault) {
            const remaining = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, session.user.id)).limit(1);
            if (remaining.length > 0) {
                await db.update(userApiConfigurations).set({ isDefault: true }).where(eq(userApiConfigurations.id, remaining[0].id));
            }
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete API config:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function setDefaultApiAction(configId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const [config] = await db.select().from(userApiConfigurations)
            .where(eq(userApiConfigurations.id, configId)).limit(1);

        if (!config || config.userId !== session.user.id) {
            return { error: "Configuration not found or not yours.", success: false };
        }

        await db.update(userApiConfigurations)
            .set({ isDefault: false })
            .where(eq(userApiConfigurations.userId, session.user.id));

        await db.update(userApiConfigurations)
            .set({ isDefault: true })
            .where(eq(userApiConfigurations.id, configId));

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to set default API config:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

export async function editApiAction(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "You must be logged in.", success: false };

        const { encrypt } = await import("@/lib/crypto");

        const configId = formData.get("configId") as string;
        const configName = formData.get("configName") as string;
        const modelName = formData.get("modelName") as string;
        const modelList = formData.get("modelList") as string;
        const apiUrl = formData.get("apiUrl") as string;
        const apiKey = formData.get("apiKey") as string;
        const apiFormat = (formData.get("apiFormat") as string) || "openai";
        const promptProcessing = (formData.get("promptProcessing") as string) || "none";
        const customPrompt = formData.get("customPrompt") as string;

        if (!configId || !configName || !modelName || !apiUrl) {
            return { error: "Please fill in all required fields.", success: false };
        }

        const [existing] = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.id, configId)).limit(1);

        if (!existing || existing.userId !== session.user.id) {
            return { error: "Configuration not found or not yours.", success: false };
        }

        const updateData: any = {
            configName,
            modelName,
            modelList: modelList || null,
            apiUrl,
            apiFormat,
            promptProcessing,
            customPrompt: customPrompt || null,
        };

        if (apiKey && apiKey.trim() !== "") {
            updateData.apiKey = encrypt(apiKey);
        }

        await db.update(userApiConfigurations).set(updateData).where(eq(userApiConfigurations.id, configId));

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to edit API config:", error);
        return { error: "An unexpected error occurred.", success: false };
    }
}

