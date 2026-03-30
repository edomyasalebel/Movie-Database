'use client';
import { favoriteMovies } from '../data/movies';
import PosterCard from '../components/PosterCard';
import styles from './FavoriteFilms.module.css';

export default function FavoriteFilms() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Favorite Films</h3>
      <div className={styles.row}>
        {favoriteMovies.map((movie) => (
          <PosterCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}