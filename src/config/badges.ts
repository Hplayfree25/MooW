import badgesData from './badges.json';

export type BadgeRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';

export interface BadgeConfig {
    id: number;
    name: string;
    description: string;
    iconUrl: string;
    rarity: BadgeRarity;
    condition: string;
}

export const BADGE_LIST: BadgeConfig[] = badgesData as BadgeConfig[];

export function getBadgeConfig(id: number): BadgeConfig | undefined {
    return BADGE_LIST.find(b => b.id === id);
}

export function getAllBadges(): BadgeConfig[] {
    return BADGE_LIST;
}
