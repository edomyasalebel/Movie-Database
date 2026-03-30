'use client';
import { useState } from 'react';
import { trendingMovies, topRatedMovies } from '../../../data/movies';
import styles from './MovieDetail.module.css';

export default function MovieDetail({ params }) {
  const allMovies = [...trendingMovies, ...topRatedMovies];
  const movie = allMovies.find((m) => m.id === parseInt(params.id));

  const [watchedStatus, setWatchedStatus] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);

  if (!movie) {
    return (
      <main className={styles.notFound}>
        <h1>Movie not found</h1>
        <p>Sorry, we couldn't find that movie.</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.backdrop}>
        <div className={styles.header}>
          <div className={styles.poster}>
            <span className={styles.posterEmoji}>{movie.emoji}</span>
          </div>

          <div className={styles.info}>
            <h1 className={styles.title}>{movie.title}</h1>
            <div className={styles.meta}>
              <span>{movie.year}</span>
              {movie.duration && <span>•</span>}
              {movie.duration && <span>{movie.duration} min</span>}
              {movie.country && <span>•</span>}
              {movie.country && <span>{movie.country}</span>}
            </div>

            <div className={styles.rating}>
              <span className={styles.stars}>{movie.stars}</span>
            </div>

            <p className={styles.description}>{movie.description}</p>

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