'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '../../../lib/supabase'; // our supabase connection
import LoadingSpinner from '../../../components/LoadingSpinner'; // reusable spinner
import styles from './MovieDetail.module.css';

export default function MovieDetail({ params }) {
  // unwrap the URL params (e.g. /movie/3 → id = '3')
  const { id } = use(params);

  // state for the movie data fetched from DB
  const [movie, setMovie] = useState(null);

  // state for the action buttons
  const [watchedStatus, setWatchedStatus] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);

  // state for loading and error handling
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovie() {
      // fetch a single movie by its ID from the movies table
      // also fetch its genres through the junction table (same pattern as browse)
      const { data, error } = await supabase
        .from('movies')
        .select('*, movie_genres(genres(name)), credits(role_type, character_name, people(name))')
        .eq('id', id)   // .eq = "where id equals this value"
        .single();      // .single() = we expect exactly one result, not an array

      if (error) {
        console.error('Error fetching movie:', error);
        setLoading(false);
        return;
      }

      setMovie(data);
      setLoading(false);
    }

    fetchMovie();
  }, [id]); // re-run if the id in the URL changes

  // show spinner while movie data is being fetched from Supabase
  if (loading) {
    return (
      <main className={styles.notFound}>
        <LoadingSpinner />
      </main>
    );
  }

  // show not found if movie doesn't exist in DB
  if (!movie) {
    return (
      <main className={styles.notFound}>
        <h1>Movie not found</h1>
        <p>Sorry, we couldn't find that movie.</p>
      </main>
    );
  }

  // get the director from credits array
  const director = movie.credits?.find((c) => c.role_type === 'director');

  // get actors from credits array
  const actors = movie.credits?.filter((c) => c.role_type === 'actor');

  return (
    <main className={styles.container}>
      <div className={styles.backdrop}>
        <div className={styles.header}>

          {/* poster image — fallback to 🎬 emoji if no poster */}
          <div className={styles.poster}>
            {movie.poster_url
              ? <img src={movie.poster_url} alt={movie.title} className={styles.posterImage} />
              : <span className={styles.posterEmoji}>🎬</span>
            }
          </div>

          <div className={styles.info}>
            {/* title */}
            <h1 className={styles.title}>{movie.title}</h1>

            {/* meta: year, duration, country — using DB field names now */}
            <div className={styles.meta}>
              <span>{movie.release_year}</span>
              {movie.duration_min && <span>•</span>}
              {movie.duration_min && <span>{movie.duration_min} min</span>}
              {movie.country && <span>•</span>}
              {movie.country && <span>{movie.country}</span>}
            </div>

            {/* genres pulled from the junction table */}
            <div className={styles.meta}>
              {movie.movie_genres?.map((mg) => mg.genres?.name).join(' · ')}
            </div>

            {/* average rating from DB */}
            <div className={styles.rating}>
              <span className={styles.stars}>⭐ {movie.average_rating} / 5</span>
            </div>

            {/* director */}
            {director && (
              <p className={styles.meta}>Directed by <strong>{director.people?.name}</strong></p>
            )}

            {/* description */}
            <p className={styles.description}>{movie.description}</p>

            {/* action buttons */}
            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${watchedStatus ? styles.active : ''}`}
                onClick={() => setWatchedStatus(!watchedStatus)}
              >
                ✓ Add to Watched
              </button>
              <button
                className={`${styles.btn} ${onWatchlist ? styles.active : ''}`}
                onClick={() => setOnWatchlist(!onWatchlist)}
              >
                + Add to Watchlist
              </button>
              <button className={styles.btn}>⭐ Rate & Review</button>
              <button className={styles.btn}>📔 Add to Diary</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
