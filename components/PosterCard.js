'use client';
import Link from 'next/link';
import styles from './PosterCard.module.css';

export default function PosterCard({ movie, rank }) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <div className={styles.card}>
        <div className={styles.poster}>
          {rank && <span className={styles.rank}>#{rank}</span>}
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className={styles.image}
            />
          ) : (
            <span>{movie.emoji}</span>
          )}
        </div>
        <div className={styles.title}>{movie.title}</div>
        <div className={styles.year}>{movie.release_year || movie.year}</div>
        <div className={styles.stars}>{movie.stars || movie.average_rating}</div>
      </div>
    </Link>
  );
}