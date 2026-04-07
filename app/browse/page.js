'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';
import LoadingSpinner from '../../components/LoadingSpinner'; // reusable spinner
import styles from './page.module.css';

const genres = ['All', 'Sci-Fi', 'Drama', 'Thriller', 'Romance', 'Crime', 'Family'];

export default function BrowsePage() {
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  useEffect(() => {
    async function fetchMovies() {
      // fetch movies AND their genres at the same time using Supabase joins
      // movie_genres is the junction table, genres is the genres table
      // this gives each movie an array of its genres nested inside
      const { data } = await supabase
        .from('movies')
        .select('*, movie_genres(genres(name))');

      setAllMovies(data || []);
      setLoading(false);
    }
    fetchMovies();
  }, []);

  const filtered = allMovies.filter((movie) => {
    // check if movie title contains the search query (case insensitive)
    const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase());

    // if 'All' is selected, skip genre filter
    // otherwise check if any of the movie's genres match the active genre
    // movie.movie_genres is an array like: [{ genres: { name: 'Drama' } }, ...]
    const matchesGenre = activeGenre === 'All' ||
      movie.movie_genres?.some((mg) => mg.genres?.name === activeGenre);

    return matchesQuery && matchesGenre;
  });

  // show spinner while movies are loading from Supabase
  if (loading) {
    return (
      <>
        <Navbar />
        <main className={styles.container}>
          <LoadingSpinner />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Browse Films</h1>
        <p className={styles.subheading}>Search and filter through the collection</p>

        {/* Search input */}
        <input
          className={styles.search}
          type="text"
          placeholder="Search by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Genre filter buttons */}
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

        {/* result count — shows how many movies match current filter */}
        {filtered.length > 0 && (
          <p className={styles.resultCount}>{filtered.length} film{filtered.length !== 1 ? 's' : ''}</p>
        )}

        {/* Results grid */}
        <div className={styles.grid}>
          {filtered.map((movie) => (
            <PosterCard key={movie.id} movie={movie} />
          ))}
        </div>

        {/* no results state */}
        {filtered.length === 0 && (
          <div className={styles.noResults}>
            <span>No results</span>
            Try a different search or genre
          </div>
        )}
      </main>
    </>
  );
}
