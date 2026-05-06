'use client';
import Link from 'next/link';
import styles from './DiaryEntry.module.css';
import PosterCard from './PosterCard';



export default function DiaryEntry({ entry }) {
  return (
    <Link href={`/diary/${entry.id}`}>
      <div className={styles.entry}>
        <div className={styles.date}>
          <div className={styles.day}>{entry.day}</div>
          <div className={styles.month}>{entry.month}</div>
        </div>
        <div className={styles.thumb}>
          {entry.poster_url
                   ? <img src={entry.poster_url} alt={entry.title} className={styles.thumbImage} loading="lazy" decoding="async" />
                   : <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--border2)' }}>MD</span>}
          </div>
        <div className={styles.info}>
          <div className={styles.entryTitle}>{entry.title}</div>
          <div className={styles.sub}>
            {entry.year}
            <span className={entry.type === 'tv' ? styles.tvBadge : styles.filmBadge}>
              {entry.type === 'tv' ? 'TV' : 'Film'}
            </span>
          </div>
        </div>
        <div className={styles.stars}>{entry.stars}</div>
      </div>
    </Link>
  );
}