'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from './page.module.css';

const genres = ['All', 'Sci-Fi', 'Drama', 'Thriller', 'Romance', 'Crime', 'Family', 'History', 'Animation'];

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState(searchParams.get('q') || '');
  const [activeGenre, setActiveGenre] = useState('All');

  useEffect(() => {
    async function fetchMovies() {
      const { data } = await supabase
        .from('movies')
        .select('*, movie_genres(genres(name))');
      setAllMovies(data || []);
      setLoading(false);
    }
    fetchMovies();
  }, []);

  const filtered = allMovies.filter((movie) => {
    const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = activeGenre === 'All' ||
      movie.movie_genres?.some((mg) => mg.genres?.name === activeGenre);
    return matchesQuery && matchesGenre;
  });

  if (loading) {
    return (
      null
    );
  }

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.container}>

        {/* page header — same bar accent style as home sections */}
        <div className={styles.header}>
          <div className={styles.bar} />
          <div>
            <h1 className={styles.heading}>Browse Films</h1>
            <p className={styles.subheading}>
              {activeGenre === 'All' ? 'All films' : activeGenre} · {allMovies.length} titles
            </p>
          </div>
        </div>

        {/* search + genre controls grouped together */}
        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.genres}>
            {genres.map((genre) => (
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

        {/* result count */}
        <p className={styles.resultCount}>
          {filtered.length} film{filtered.length !== 1 ? 's' : ''}
          {query && <span> matching <em>"{query}"</em></span>}
        </p>

        {/* grid */}
        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className={styles.noResults}>
            <span>No results</span>
            Try a different title or genre
          </div>
        )}

      </main>
    </>
  );
}
