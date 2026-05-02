'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';
import styles from './page.module.css';

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = inputValue.trim();
      setQuery(trimmed);
      if (trimmed) {
        router.replace('/search?q=' + encodeURIComponent(trimmed));
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputValue]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    supabase
      .from('movies')
      .select('id, title, type, release_year, poster_url, average_rating')
      .ilike('title', `%${query}%`)
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(200)
      .then(({ data }) => {
        setResults(data || []);
        setLoading(false);
      });
  }, [query]);

  const movies = results.filter((r) => r.type === 'movie');
  const tvShows = results.filter((r) => r.type === 'tv');
  const displayed =
    activeTab === 'movie' ? movies :
    activeTab === 'tv' ? tvShows :
    results;

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.container}>

        <div className={styles.header}>
          <div className={styles.bar} />
          <div>
            <h1 className={styles.heading}>Search</h1>
            <p className={styles.subheading}>
              {query
                ? `${displayed.length} result${displayed.length !== 1 ? 's' : ''} for "${query}"`
                : 'Enter a title to search'}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search movies & TV shows..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />

          <div className={styles.tabs}>
            {[['all', `All (${results.length})`], ['movie', `Movies (${movies.length})`], ['tv', `TV Shows (${tvShows.length})`]].map(([val, label]) => (
              <button
                key={val}
                className={`${styles.tab} ${activeTab === val ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? null : displayed.length > 0 ? (
          <div className={styles.grid}>
            {displayed.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : query ? (
          <div className={styles.empty}>
            <span>No results for "{query}"</span>
            <p>Try a different spelling, or <Link href="/browse" className={styles.browseLink}>browse all titles</Link>.</p>
          </div>
        ) : null}

      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
