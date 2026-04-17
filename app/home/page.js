'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import TrendingRow from '../../components/TrendingRow';
import TopRatedList from '../../components/TopRatedList';
import ProfileStrip from '../../components/ProfileStrip';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [trending, setTrending]     = useState([]);
  const [topRated, setTopRated]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults]       = useState([]);   // live search results
  const [showDrop, setShowDrop]     = useState(false); // whether dropdown is open
  const wrapRef = useRef(null); // ref to detect clicks outside the dropdown

  // fetch trending + top rated on mount
  useEffect(() => {
    async function fetchData() {
      const { data: trendingData } = await supabase
        .from('movies').select('*').order('id', { ascending: false }).limit(8);
      const { data: topRatedData } = await supabase
        .from('movies').select('*').order('average_rating', { ascending: false }).limit(8);
      setTrending(trendingData || []);
      setTopRated(topRatedData || []);
      setLoading(false);
    }
    fetchData();
  }, []);

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
        .select('id, title, release_year, poster_url')
        .ilike('title', `%${searchQuery}%`)
        .limit(6); // max 6 results in the dropdown

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

  if (loading) {
    return (
      <>
        <Navbar onLogout={() => router.push('/')} />
        <main className={styles.main}><LoadingSpinner /></main>
      </>
    );
  }

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>

        {/* hero + search */}
        <div className={styles.searchHero}>
          <h1 className={styles.heroHeadline}>What have you been <em>watching?</em></h1>
          <p className={styles.heroSub}>Track films, write reviews, build your diary.</p>
          <div className={styles.searchWrap} ref={wrapRef}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search films..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
            />

            {/* dropdown — only visible when there are results */}
            {showDrop && results.length > 0 && (
              <div className={styles.dropdown}>
                {results.map((movie) => (
                  // clicking a result navigates to movie detail page
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}`}
                    className={styles.dropItem}
                    onClick={() => { setShowDrop(false); setSearchQuery(''); }}
                  >
                    {/* tiny poster thumbnail */}
                    <div className={styles.dropThumb}>
                      {movie.poster_url
                        ? <img src={movie.poster_url} alt={movie.title} className={styles.dropImg} />
                        : <span>🎬</span>
                      }
                    </div>
                    <div className={styles.dropInfo}>
                      <div className={styles.dropTitle}>{movie.title}</div>
                      <div className={styles.dropYear}>{movie.release_year}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <TrendingRow movies={trending} />
        <div className={styles.divider} />
        <TopRatedList movies={topRated} />
        <div className={styles.divider} />
        <ProfileStrip onNavigate={() => router.push('/profile')} />

      </main>
    </>
  );
}
