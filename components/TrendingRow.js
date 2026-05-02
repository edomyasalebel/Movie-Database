'use client';

import PosterCard from './PosterCard';
import styles from './TrendingRow.module.css';

export default function TrendingRow({ movies = [], label }) {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <div className={styles.bar} />
        {/* label prop lets home page override heading for TV row */}
        <h2>{label ? label : <>Trending <span>this week</span></>}</h2>
      </div>
      <div className={styles.row}>
        {movies.map((movie, i) => (
          <PosterCard key={movie.id} movie={movie} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
