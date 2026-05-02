'use client';
import Link from 'next/link';
import styles from './TopRatedList.module.css';

export default function TopRatedList({ movies = [], label }) {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <div className={styles.bar} />
        {/* label prop lets home page override the heading for TV rows */}
        <h2>{label || <>Top Rated <span>all time</span></>}</h2>
      </div>
      <div className={styles.list}>
        {movies.map((movie, i) => (
          <Link key={movie.id} href={movie.type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`} className={styles.item}>
            <div className={styles.num}>{i + 1}</div>
            <div className={styles.thumb}>
              {movie.poster_url
                ? <img src={movie.poster_url} alt={movie.title} className={styles.thumbImage} />
                : '🎬'
              }
            </div>
            <div className={styles.info}>
              <div className={styles.title}>{movie.title}</div>
              <div className={styles.meta}>{movie.release_year} · {movie.country}</div>
            </div>
            <div className={styles.score}>
              <span className={styles.scoreStar}>★</span>
              <span className={styles.scoreVal}>{Number(movie.average_rating).toFixed(2)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
