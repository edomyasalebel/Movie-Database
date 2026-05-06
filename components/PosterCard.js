'use client';
import Link from 'next/link';
import styles from './PosterCard.module.css';

export default function PosterCard({ movie, rank }) {
  // route to /tv/[id] for TV shows, /movie/[id] for everything else
  const href = movie.type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;
  return (
    <Link href={href}>
      <div className={styles.card}>
        <div className={styles.poster}>
          {rank && <span className={styles.rank}>#{rank}</span>}
          {movie.type === 'tv'
            ? <span className={styles.tvBadge}>TV</span>
            : <span className={styles.filmBadge}>Film</span>
          }
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className={styles.image}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderLogo}>MD</span>
            </div>
          )}
        </div>
        <div className={styles.title}>{movie.title}</div>
        <div className={styles.year}>{movie.release_year || movie.year}</div>
        <div className={styles.stars}>{movie.stars || (movie.average_rating ? Number(movie.average_rating).toFixed(2) : '')}</div>
      </div>
    </Link>
  );
}