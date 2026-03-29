'use client';
import { topRatedMovies } from '../data/movies';
import styles from './TopRatedList.module.css';

export default function TopRatedList() {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <div className={styles.bar} />
        <h2>Top Rated <span>all time</span></h2>
      </div>
      <div className={styles.list}>
        {topRatedMovies.map((movie, i) => (
          <div key={movie.id} className={styles.item}>
            <div className={styles.num}>{i + 1}</div>
            <div className={styles.thumb}>{movie.emoji}</div>
            <div className={styles.info}>
              <div className={styles.title}>{movie.title}</div>
              <div className={styles.meta}>{movie.year} · {movie.genre}</div>
            </div>
            <div className={styles.score}>
              <div className={styles.scoreVal}>{movie.score}</div>
              <div className={styles.scoreLabel}>Score</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
