'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PosterCard from '../components/PosterCard';
import styles from './FavoriteFilms.module.css';

export default function FavoriteFilms() {
  // holds the list of favorite movies once fetched
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // fetchFavorites must be inside useEffect so it runs after the component loads
    async function fetchFavorites() {
      // Step 1: get the logged-in user's session
      const { data: { session } } = await supabase.auth.getSession();

      // if no one is logged in, nothing to fetch
      if (!session) return;

      // Step 2: fetch this user's favorites and JOIN with movies table
      // favorites table has: user_id, movie_id
      // we JOIN movies so we get title, poster_url etc. in one query
      const { data, error } = await supabase
        .from('favorites')
        .select('movie_id, movies(id, title, release_year, poster_url, average_rating)')
        .eq('user_id', session.user.id)  // only this user's favorites
        .limit(5);                        // show max 5 on the profile

      if (error) {
        console.error('Error fetching favorites:', error.message);
        return;
      }

      // Step 3: transform into the shape PosterCard expects
      // favorites rows look like: { movie_id, movies: { id, title, ... } }
      // PosterCard expects: { id, title, release_year, poster_url, average_rating }
      const transformed = data.map((fav) => ({
        id:             fav.movies.id,
        title:          fav.movies.title,
        release_year:   fav.movies.release_year,
        poster_url:     fav.movies.poster_url,
        average_rating: fav.movies.average_rating,
      }));

      setFavorites(transformed);
    }

    fetchFavorites(); // kick it off
  }, []); // [] = run once when component first loads

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Favorite Films</h3>
      <div className={styles.row}>
        {favorites.map((movie) => (
          <PosterCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
