'use client';
import { watchlistMovies } from '../data/movies';
import PosterCard from './PosterCard';
import styles from './WatchlistGrid.module.css';

export default function WatchlistGrid() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Watchlist</h3>
      {/* TODO: render a grid of PosterCards using watchlistMovies */}
    </div>
  );
}
