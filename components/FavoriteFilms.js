'use client';
import { favoriteMovies } from '../data/movies';
import styles from './FavoriteFilms.module.css';

export default function FavoriteFilms() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Favorite Films</h3>
      <div className={styles.row}>
        {favoriteMovies.map((movie) => (
          <div key={movie.id} className={styles.card} style={{ background: movie.bg }}>
            <span className={styles.emoji}>{movie.emoji}</span>
            <div className={styles.label}>{movie.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
