'use client';
import styles from './PosterCard.module.css';

export default function PosterCard({ movie, rank }) {
  return (
    <div className={styles.card}>
      <div className={styles.poster}>
        {rank && <span className={styles.rank}>#{rank}</span>}
        <span>{movie.emoji}</span>
      </div>
      <div className={styles.title}>{movie.title}</div>
      <div className={styles.year}>{movie.year}</div>
      <div className={styles.stars}>{movie.stars}</div>
    </div>
  );
}
