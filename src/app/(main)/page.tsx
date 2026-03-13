"use client";

import { useState, useEffect } from "react";
import { Search, Flame, Star, Clock, MessageSquare, Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'mark', 'span'],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), 'style', 'className', 'class', 'data-spoiler'],
    div: [...(defaultSchema.attributes?.div || []), 'style', 'align'],
    mark: ['style', 'class', 'className'],
  },
};

import styles from "./page.module.css";
import { getCharactersAction } from "./actions";
import { ErrorModal } from "@/components/ErrorModal";

const parseInlineStyle = (styleString?: string) => {
  if (!styleString || typeof styleString !== 'string') return undefined;
  const styleObj: any = {};
  styleString.split(';').forEach((s: string) => {
    const [key, ...valueParts] = s.split(':');
    const value = valueParts.join(':');
    if (key && value) {
      const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
      styleObj[camelKey] = value.trim();
    }
  });
  return Object.keys(styleObj).length > 0 ? styleObj : undefined;
};

const markdownComponents = {
  div: ({ node, align, className, children, ...props }: any) => {
    const alignVal = align || node?.properties?.align;
    return (
      <div className={className} style={alignVal ? { textAlign: alignVal } : undefined} {...props}>
        {children}
      </div>
    );
  },
  span: ({ node, className, children, ...props }: any) => {
    const style = parseInlineStyle(node?.properties?.style);
    const isSpoiler = node?.properties && 'data-spoiler' in node.properties;
    return (
      <span
        className={className || (isSpoiler ? 'spoiler-mark' : undefined)}
        style={style}
        data-spoiler={isSpoiler ? "" : undefined}
        {...props}
      >
        {children}
      </span>
    );
  },
  mark: ({ node, className, children, ...props }: any) => {
    const style = parseInlineStyle(node?.properties?.style);
    return (
      <mark className={className} style={style} {...props}>
        {children}
      </mark>
    );
  }
};

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");
  const [characters, setCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchDb() {
      const res = await getCharactersAction();
      if (res.success && res.data) {
        setCharacters(res.data);
      } else {
        setErrorMsg(res.error || "Failed to fetch characters from server. Database might be unreachable.");
      }
      setIsLoading(false);
    }
    fetchDb();
  }, []);

  const filteredCharacters = characters.filter(char => {
    const matchesCategory = activeCategory === "All" ? true : char.contentRating === "Limited";
    const matchesVisibility = char.publishSettings !== "Private";

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" ||
      (char.characterName && char.characterName.toLowerCase().includes(query)) ||
      (char.characterBio && char.characterBio.toLowerCase().includes(query)) ||
      (char.creatorNotes && char.creatorNotes.toLowerCase().includes(query)) ||
      (char.tags && char.tags.some((tag: string) => tag.toLowerCase().includes(query)));

    return matchesCategory && matchesVisibility && matchesSearch;
  });

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className={styles.exploreContainer} suppressHydrationWarning>
      <div className={styles.exploreHeader}>
        <div className={styles.searchBarWrapper}>
          <Search size={20} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search characters, personalities, or scenarios... (Press Enter)"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <div className={styles.filtersWrapper}>
          <div className={styles.leftFilters}>
            <button
              className={`${styles.filterBtn} ${activeCategory === 'All' ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            <button
              className={`${styles.filterBtn} ${activeCategory === 'Limited' ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveCategory('Limited')}
            >
              Limited Only
            </button>
          </div>

          <div className={styles.rightFilters}>
            <button
              className={`${styles.filterBtn} ${activeSort === 'Trending' ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveSort('Trending')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={16} /> Trending</span>
            </button>
            <button
              className={`${styles.filterBtn} ${activeSort === 'Favorite' ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveSort('Favorite')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={16} /> Favorites</span>
            </button>
            <button
              className={`${styles.filterBtn} ${activeSort === 'Recent' ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveSort('Recent')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> Total Chars</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.characterGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={`skeleton-${i}`} className={styles.characterCard} style={{ cursor: 'default' }}>
              <div className={`${styles.cardAvatar} skeleton`} />
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo} style={{ width: '100%' }}>
                    <div className="skeleton" style={{ height: '20px', width: '70%', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                  </div>
                </div>

                <div className="skeleton" style={{ height: '48px', width: '100%', margin: '0' }} />

                <div className={styles.cardTags} style={{ marginBottom: '0' }}>
                  <div className="skeleton" style={{ height: '24px', width: '60px', borderRadius: 'var(--radius-full)' }} />
                  <div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: 'var(--radius-full)' }} />
                </div>

                <div className={styles.cardFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
                  <div className={styles.stats}>
                    <div className="skeleton" style={{ height: '20px', width: '40px' }} />
                    <div className="skeleton" style={{ height: '20px', width: '40px' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.characterGrid}>
          {filteredCharacters.map((char, index) => (
            <div key={char.id} className={styles.characterCard} onClick={() => router.push(`/character/${char.id}`)}>
              {char.imageUrl ? (
                <div className={styles.cardAvatar} style={{ backgroundImage: `url(${char.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
              ) : (
                <div className={`${styles.cardAvatar} ${index % 2 === 0 ? styles.cardAvatarFallback : ''}`} style={index % 2 !== 0 ? { background: 'linear-gradient(135deg, #f43f5e, #f97316)' } : {}} />
              )}

              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{char.characterName}</h3>
                    <div className={styles.cardCreator}>
                        <span style={{ color: '#3b82f6', fontWeight: 500 }}>@{char.creatorUsername || char.creatorId || "system"}</span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.cardBio} ${styles.markdownBio}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                    components={markdownComponents}
                  >
                    {char.characterBio || char.creatorNotes || ""}
                  </ReactMarkdown>
                </div>

                <div className={styles.cardTags}>
                  {char.tags && char.tags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                  {char.tags && char.tags.length > 4 && (
                    <span className={styles.tag} style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: 600 }}>+{char.tags.length - 4}</span>
                  )}
                </div>

                <div className={styles.cardFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
                  <div className={styles.stats}>
                    <div className={styles.statItem}>
                      <MessageSquare size={14} />
                      {char.chatCount || 0}
                    </div>
                    <div className={styles.statItem}>
                      <Heart size={14} fill={char.hasLiked ? "#ef4444" : "transparent"} color={char.hasLiked ? "#ef4444" : "currentColor"} />
                      {char.likesCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredCharacters.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>
          <p>No characters found in Database. Create one!</p>
        </div>
      )}

      <ErrorModal
        isOpen={!!errorMsg}
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />
    </div>
  );
}
