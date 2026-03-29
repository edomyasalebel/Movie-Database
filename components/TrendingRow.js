'use client';
import PosterCard from './PosterCard';
import { trendingMovies } from '../data/movies';
import styles from './TrendingRow.module.css';

export default function TrendingRow() {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <div className={styles.bar} />
        <h2>Trending <span>this week</span></h2>
      </div>
      <div className={styles.row}>
        {trendingMovies.map((movie, i) => (
          <PosterCard key={movie.id} movie={movie} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
