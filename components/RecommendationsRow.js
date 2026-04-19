'use client';
import PosterCard from './PosterCard';
import styles from './TrendingRow.module.css';

export default function RecommendationsRow({ movies = [] }) {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <div className={styles.bar} />
        <h2>Recommended <span>for you</span></h2>
      </div>
      <div className={styles.row}>
        {movies.map((movie) => (
          <PosterCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}
