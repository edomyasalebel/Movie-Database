'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';
import styles from './page.module.css';

const PAGE_SIZE = 48;

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [genres, setGenres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeType, setActiveType] = useState('all');
  const [sort, setSort] = useState('top_rated');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    supabase.from('genres').select('name').order('name').then(({ data }) => {
      setGenres(data ? data.map((g) => g.name) : []);
    });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
      setMovies([]);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    setPage(0);
    setMovies([]);
  }, [activeGenre, activeType, sort, yearFrom, yearTo]);

  useEffect(() => {
    fetchMovies(0, true);
  }, [debouncedQuery, activeGenre, activeType, sort, yearFrom, yearTo]);

  async function fetchMovies(pageNum, replace) {
    setLoading(true);

    let q = supabase
      .from('movies')
      .select('id, title, type, release_year, poster_url, average_rating, tmdb_vote_count, movie_genres(genres(name))', { count: 'exact' });

    if (debouncedQuery.trim()) {
      q = q.ilike('title', `%${debouncedQuery.trim()}%`);
    }

    if (activeType !== 'all') {
      q = q.eq('type', activeType);
    }

    if (activeGenre !== 'All') {
      const { data: genreRows } = await supabase
        .from('genres')
        .select('id')
        .eq('name', activeGenre)
        .single();
      if (genreRows) {
        const { data: movieIds } = await supabase
          .from('movie_genres')
          .select('movie_id')
          .eq('genre_id', genreRows.id);
        const ids = (movieIds || []).map((r) => r.movie_id);
        if (ids.length === 0) {
          setMovies([]);
          setTotal(0);
          setHasMore(false);
          setLoading(false);
          return;
        }
        q = q.in('id', ids);
      }
    }

    if (yearFrom) q = q.gte('release_year', parseInt(yearFrom, 10));
    if (yearTo) q = q.lte('release_year', parseInt(yearTo, 10));

    if (sort === 'top_rated') q = q.order('average_rating', { ascending: false, nullsFirst: false });
    else if (sort === 'newest') q = q.order('release_year', { ascending: false, nullsFirst: false });

    const from = pageNum * PAGE_SIZE;
    q = q.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await q;
    const fetched = data || [];

    setMovies((prev) => (replace ? fetched : [...prev, ...fetched]));
    setTotal(count || 0);
    setHasMore(from + fetched.length < (count || 0));
    setPage(pageNum);
    setLoading(false);
  }

  function loadMore() {
    const next = page + 1;
    fetchMovies(next, false);
  }

  const allGenres = ['All', ...genres];

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.container}>

        <div className={styles.header}>
          <div className={styles.bar} />
          <div>
            <h1 className={styles.heading}>Browse</h1>
            <p className={styles.subheading}>
              {activeGenre === 'All' ? 'All titles' : activeGenre}
              {activeType !== 'all' ? ` · ${activeType === 'movie' ? 'Movies' : 'TV Shows'}` : ''}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className={styles.sortRow}>
            <div className={styles.typeToggle}>
              {[['all', 'All'], ['movie', 'Movies'], ['tv', 'TV']].map(([val, label]) => (
                <button
                  key={val}
                  className={`${styles.typeBtn} ${activeType === val ? styles.typeBtnActive : ''}`}
                  onClick={() => setActiveType(val)}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="top_rated">Top Rated</option>
              <option value="newest">Newest</option>
            </select>

            <div className={styles.yearRange}>
              <input
                className={styles.yearInput}
                type="number"
                placeholder="From"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                min="1900"
                max="2099"
              />
              <span className={styles.yearSep}>–</span>
              <input
                className={styles.yearInput}
                type="number"
                placeholder="To"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                min="1900"
                max="2099"
              />
            </div>
          </div>

          <div className={styles.genres}>
            {allGenres.map((genre) => (
              <button
                key={genre}
                className={`${styles.genreBtn} ${activeGenre === genre ? styles.active : ''}`}
                onClick={() => setActiveGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.resultCount}>
          {total} title{total !== 1 ? 's' : ''}
          {debouncedQuery && <span> matching <em>"{debouncedQuery}"</em></span>}
        </p>

        {movies.length > 0 ? (
          <>
            <div className={styles.grid}>
              {movies.map((movie) => (
                <PosterCard key={movie.id} movie={movie} />
              ))}
            </div>
            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMore}
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : loading ? null : (
          <div className={styles.noResults}>
            <span>No results</span>
            Try a different title or genre
          </div>
        )}

      </main>
    </>
  );
}
