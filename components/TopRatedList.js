'use client';
import { useState } from 'react';
import PosterCard from './PosterCard';
import styles from './TopRatedList.module.css';

export default function TopRatedList({ movies = [], tvShows = [] }) {
  const [tab, setTab] = useState('movies');
  const items = tab === 'movies' ? movies : tvShows;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.bar} />
          <h2 className={styles.title}>Top Rated</h2>
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'movies' ? styles.tabActive : ''}`}
            onClick={() => setTab('movies')}
          >
            Movies
          </button>
          <button
            className={`${styles.tab} ${tab === 'tv' ? styles.tabActive : ''}`}
            onClick={() => setTab('tv')}
          >
            TV Shows
          </button>
        </div>
      </div>

      <div className={styles.row}>
        {items.map((movie, i) => (
          <PosterCard key={movie.id} movie={movie} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
