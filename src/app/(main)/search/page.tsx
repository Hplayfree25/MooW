"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Search, Flame, Star, Clock, MessageSquare, Heart, ArrowLeft, Loader2, Frown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./search.module.css";
import { getCharactersAction } from "../actions";
import { ErrorModal } from "@/components/ErrorModal";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSort, setActiveSort] = useState("Relevance");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchDb() {
      const res = await getCharactersAction(200);
      if (res.success && res.data) {
        setCharacters(res.data);
      } else {
        setErrorMsg(res.error || "Failed to fetch characters from server.");
      }
      setIsLoading(false);
    }
    fetchDb();
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery) params.set('q', searchQuery);
      else params.delete('q');
      router.push(`/search?${params.toString()}`);
    }
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    characters.forEach(char => {
      if (char.tags && Array.isArray(char.tags)) {
        char.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [characters]);

  const filteredAndSortedCharacters = useMemo(() => {
    let result = characters.filter(char => char.publishSettings !== "Private");

    const query = (searchParams.get('q') || '').toLowerCase();

    if (query) {
      result = result.filter(char =>
        char.characterName.toLowerCase().includes(query) ||
        char.characterBio.toLowerCase().includes(query) ||
        char.creatorId?.toLowerCase().includes(query) ||
        (char.tags && char.tags.some((t: string) => t.toLowerCase().includes(query)))
      );
    }

    if (activeTags.length > 0) {
      result = result.filter(char =>
        char.tags && activeTags.every(tag => char.tags.includes(tag))
      );
    }

    result.sort((a, b) => {
      if (activeSort === "Popular") {
        return (b.likesCount || 0) - (a.likesCount || 0);
      } else if (activeSort === "Creation Date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (activeSort === "Trending") {
        return (b.chatCount || 0) - (a.chatCount || 0);
      } else if (activeSort === "Relevance" && query) {
        const aNameMatch = a.characterName.toLowerCase().includes(query) ? 1 : 0;
        const bNameMatch = b.characterName.toLowerCase().includes(query) ? 1 : 0;
        if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return 0;
    });

    return result;
  }, [characters, searchParams, activeTags, activeSort]);

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchHeader}>
        <div className={styles.titleRow}>
          <button onClick={() => router.push('/')} className={styles.backBtn}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.searchTitle}>Advanced Search</h1>
        </div>

        <div className={styles.searchBarWrapper}>
          <Search size={20} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Type and press Enter to search..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Sort By</span>
            <div className={styles.filterOptions}>
              {["Relevance", "Popular", "Trending", "Creation Date"].map(sort => (
                <button
                  key={sort}
                  className={`${styles.filterBtn} ${activeSort === sort ? styles.filterBtnActive : ''}`}
                  onClick={() => setActiveSort(sort)}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Filter by Tags</span>
              <div className={styles.filterOptions}>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    className={`${styles.filterBtn} ${activeTags.includes(tag) ? styles.filterBtnActive : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.resultsHeader}>
        <span>Found {filteredAndSortedCharacters.length} characters</span>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <Loader2 size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
          <p>Searching database...</p>
        </div>
      ) : filteredAndSortedCharacters.length === 0 ? (
        <div className={styles.emptyState}>
          <Frown size={64} color="var(--text-tertiary)" />
          <h2>No characters found</h2>
          <p>Try adjusting your search terms or clearing some filters.</p>
          <button
            className={styles.filterBtn}
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setSearchQuery("");
              setActiveTags([]);
              router.push('/search');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className={styles.characterGrid}>
          {filteredAndSortedCharacters.map((char, index) => (
            <div key={char.id} className={styles.characterCard} onClick={() => router.push(`/character/${char.id}`)}>
              {char.imageUrl ? (
                <div className={styles.cardAvatar} style={{ backgroundImage: `url(${char.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
              ) : (
                <div className={`${styles.cardAvatar} ${index % 2 === 0 ? styles.cardAvatarFallback : ''}`} style={index % 2 !== 0 ? { background: 'linear-gradient(135deg, #f43f5e, #f97316)' } : {}} />
              )}

              <div className={styles.cardContent}>
                <h3 className={styles.cardName}>{char.characterName}</h3>
                <div className={styles.cardCreator}>@{char.creatorId || "system"}</div>

                <div className={styles.cardTags}>
                  {char.tags && char.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                  {char.tags && char.tags.length > 3 && (
                    <span className={styles.tag} style={{ backgroundColor: 'var(--bg-tertiary)' }}>+{char.tags.length - 3}</span>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.statItem}>
                    <MessageSquare size={14} />
                    {char.chatCount || 0}
                  </div>
                  <div className={styles.statItem}>
                    <Heart size={14} />
                    {char.likesCount || 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}><Loader2 size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
