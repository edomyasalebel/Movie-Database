'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import TrendingRow from '../../components/TrendingRow';
import TopRatedList from '../../components/TopRatedList';
import RecommendationsRow from '../../components/RecommendationsRow';
import ProfileStrip from '../../components/ProfileStrip';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [trending, setTrending]         = useState([]);
  const [topRated, setTopRated]         = useState([]);
  const [trendingTv, setTrendingTv]     = useState([]);
  const [topRatedTv, setTopRatedTv]     = useState([]);
  const [recommendations, setRecs]      = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults]       = useState([]);
  const [showDrop, setShowDrop]     = useState(false);
  const wrapRef = useRef(null);

  // hero carousel — rotates through trending movies + TV shows
  const [heroItems, setHeroItems]   = useState([]);
  const [heroIndex, setHeroIndex]   = useState(0);
  const [heroKey, setHeroKey]       = useState(0); // incremented to retrigger CSS animation

  useEffect(() => {
    async function fetchData() {
      const [
        { data: trendingData },
        { data: topRatedData },
        { data: trendingTvData },
        { data: topRatedTvData },
      ] = await Promise.all([
        supabase.rpc('get_trending',    { lim: 8 }),
        supabase.rpc('get_top_rated',   { lim: 8 }),
        supabase.rpc('get_trending_tv', { lim: 8 }),
        supabase.rpc('get_top_rated_tv',{ lim: 8 }),
      ]);

      setTrending(trendingData     || []);
      setTopRated(topRatedData     || []);
      setTrendingTv(trendingTvData || []);
      setTopRatedTv(topRatedTvData || []);

      // if movie rows are empty, sync from TMDB in the background
      if (!trendingData || trendingData.length === 0) {
        fetch('/api/sync/trending').then(() =>
          supabase.rpc('get_trending', { lim: 8 }).then(({ data }) => {
            if (data) setTrending(data);
          })
        );
      }
      if (!topRatedData || topRatedData.length === 0) {
        fetch('/api/sync/top-rated').then(() =>
          supabase.rpc('get_top_rated', { lim: 8 }).then(({ data }) => {
            if (data) setTopRated(data);
          })
        );
      }

      // if TV rows are empty, sync from TMDB in the background
      if (!trendingTvData || trendingTvData.length === 0) {
        fetch('/api/sync/trending-tv').then(() =>
          supabase.rpc('get_trending_tv', { lim: 8 }).then(({ data }) => {
            if (data) setTrendingTv(data);
          })
        );
      }
      if (!topRatedTvData || topRatedTvData.length === 0) {
        fetch('/api/sync/top-rated-tv').then(() =>
          supabase.rpc('get_top_rated_tv', { lim: 8 }).then(({ data }) => {
            if (data) setTopRatedTv(data);
          })
        );
      }

      // fetch recommendations if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: recsData } = await supabase.rpc('get_recommendations', { uid: session.user.id, lim: 8 });
        setRecs(recsData || []);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  // build hero pool once trending data loads — tag type since RPC doesn't return it
  useEffect(() => {
    const pool = [
      ...trending.map((m) => ({ ...m, type: 'movie' })),
      ...trendingTv.map((m) => ({ ...m, type: 'tv' })),
    ].filter((m) => m.backdrop_url || m.poster_url).slice(0, 16);
    if (pool.length > 0) setHeroItems(pool);
  }, [trending, trendingTv]);

  // auto-rotate hero every 6 seconds
  useEffect(() => {
    if (heroItems.length === 0) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroItems.length);
      setHeroKey((k) => k + 1); // triggers CSS animation re-run via key change
    }, 6000);
    return () => clearInterval(t);
  }, [heroItems]);

  // live search — fires 300ms after user stops typing (debounce)
  // this prevents a DB query on every single keypress
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowDrop(false);
      return;
    }

    const timeout = setTimeout(async () => {
      // .ilike = case-insensitive LIKE — matches any title containing the query
      const { data } = await supabase
        .from('movies')
        .select('id, title, release_year, poster_url, type') // type needed to route TV shows to /tv/[id]
        .ilike('title', `%${searchQuery}%`)
        .limit(6);

      setResults(data || []);
      setShowDrop(true);
    }, 300); // wait 300ms after user stops typing

    // cleanup: if user types again before 300ms, cancel the previous timer
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // close dropdown when user clicks outside the search area
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return null;

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>

        {/* ── hero carousel ── */}
        <div className={styles.hero}>

          {/* rotating backdrop — key change forces remount and retriggers slide-in animation */}
          {heroItems.length > 0 && (() => {
            const item = heroItems[heroIndex];
            return (
              <div key={heroKey} className={styles.heroBackdrop}>
                <img
                  src={item.backdrop_url || item.poster_url}
                  alt={item.title}
                  className={styles.heroBackdropImg}
                />
                {/* vintage vignette layered on top of the image */}
                <div className={styles.heroVignette} />
              </div>
            );
          })()}

          {/* title + description animate in on each slide */}
          {heroItems.length > 0 && (
            <div key={`info-${heroKey}`} className={styles.heroInfo}>
              <span className={styles.heroBadge}>
                {heroItems[heroIndex].type === 'tv' ? 'TV Series' : 'Film'}
              </span>
              <h2 className={styles.heroTitle}>{heroItems[heroIndex].title}</h2>
              {heroItems[heroIndex].description && (
                <p className={styles.heroDesc}>
                  {heroItems[heroIndex].description.slice(0, 160)}
                  {heroItems[heroIndex].description.length > 160 ? '…' : ''}
                </p>
              )}
              {/* dot indicators */}
              <div className={styles.heroDots}>
                {heroItems.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.heroDot} ${i === heroIndex ? styles.heroDotActive : ''}`}
                    onClick={() => { setHeroIndex(i); setHeroKey((k) => k + 1); }}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* search bar sits below the hero so the dropdown is never clipped */}
        <div className={styles.heroSearch}>
          <div className={styles.searchWrap} ref={wrapRef}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search movies & TV shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  router.push('/search?q=' + encodeURIComponent(searchQuery.trim()));
                  setShowDrop(false);
                }
              }}
            />
            {showDrop && results.length > 0 && (
              <div className={styles.dropdown}>
                {results.map((movie) => (
                  <Link
                    key={movie.id}
                    href={movie.type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`}
                    className={styles.dropItem}
                    onClick={() => { setShowDrop(false); setSearchQuery(''); }}
                  >
                    <div className={styles.dropThumb}>
                      {movie.poster_url
                        ? <img src={movie.poster_url} alt={movie.title} className={styles.dropImg} />
                        : <span>🎬</span>
                      }
                    </div>
                    <div className={styles.dropInfo}>
                      <div className={styles.dropTitle}>{movie.title}</div>
                      <div className={styles.dropMeta}>
                        {movie.release_year}
                        <span className={movie.type === 'tv' ? styles.badgeTv : styles.badgeFilm}>
                          {movie.type === 'tv' ? 'TV' : 'Film'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}`}
                  className={styles.dropSeeAll}
                  onClick={() => setShowDrop(false)}
                >
                  See all results →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* gradient bleed — dissolves hero into content below */}
        <div className={styles.heroBleed} aria-hidden="true" />

        {/* Movies trending + TV trending stacked */}
        <TrendingRow movies={trending.map((m) => ({ ...m, type: 'movie' }))} label="Trending Movies" />
        {trendingTv.length > 0 && (
          <>
            <div className={styles.divider} />
            <TrendingRow movies={trendingTv.map((m) => ({ ...m, type: 'tv' }))} label="Trending TV Shows" />
          </>
        )}

        {/* Top rated movies + TV side by side */}
        <div className={styles.divider} />
        <div className={styles.topRatedRow}>
          <TopRatedList movies={topRated.map((m) => ({ ...m, type: 'movie' }))} label="Top Rated Movies" />
          {topRatedTv.length > 0 && (
            <TopRatedList movies={topRatedTv.map((m) => ({ ...m, type: 'tv' }))} label="Top Rated TV" />
          )}
        </div>

        {recommendations.length > 0 && (
          <>
            <div className={styles.divider} />
            <RecommendationsRow movies={recommendations} />
          </>
        )}
        <div className={styles.divider} />
        <ProfileStrip onNavigate={() => router.push('/profile')} />

      </main>
    </>
  );
}
