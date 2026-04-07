'use client';
import { useState } from 'react';
import { trendingMovies, topRatedMovies } from '../../data/movies';
import Navbar from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';
import styles from './page.module.css';

const allMovies = [...trendingMovies, ...topRatedMovies];

const genres = ['All', 'Sci-Fi', 'Drama', 'Thriller', 'Romance', 'Crime', 'Family'];

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  // filter allMovies by query and activeGenre, store result in a variable
  const filtered = allMovies.filter((movie) => {
  const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase());
  const matchesGenre = activeGenre === 'All' || movie.genre?.includes(activeGenre);
  return matchesQuery && matchesGenre; });

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Browse Films</h1>

        {/* Search input */}
        <input
          className={styles.search}
          type="text"
          placeholder="Search movies..."
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

        {/* Results grid */}
        <div className={styles.grid}>
          {filtered.map((movie) => (
            <PosterCard key={movie.id} movie={movie} />
          ))}
        </div>

        {/* TODO: show a "no results" message when filtered is empty */}
        {filtered.length === 0 && (
          <p className={styles.empty}>No movies found.</p>
        )}
      </main>
    </>
  );
}
