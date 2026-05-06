'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PosterCard from './PosterCard';
import styles from './WatchlistGrid.module.css';

export default function WatchlistGrid() {
  // holds the list of watchlist movies once fetched from DB
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    async function fetchWatchlist() {
      // Step 1: get the logged-in user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Step 2: fetch this user's watchlist and JOIN with movies table
      // watchlist table has: user_id, movie_id
      // we JOIN movies to get title, poster_url etc. in one query
      const { data, error } = await supabase
        .from('watchlist')
        .select('movie_id, movies(id, title, release_year, poster_url, average_rating, type)')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching watchlist:', error.message);
        return;
      }

      // Step 3: flatten each row — PosterCard just needs the movie object
      const transformed = data.map((item) => ({
        id:             item.movies.id,
        title:          item.movies.title,
        release_year:   item.movies.release_year,
        poster_url:     item.movies.poster_url,
        average_rating: item.movies.average_rating,
        type:           item.movies.type,
      }));

      setMovies(transformed);
    }

    fetchWatchlist();
  }, []);

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Watchlist</h3>
      {movies.length === 0 ? (
        // show a message if the watchlist is empty
        <p className={styles.empty}>No titles in your watchlist yet.</p>
      ) : (
        <div className={styles.grid}>
          {movies.map((movie) => (
            <PosterCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
