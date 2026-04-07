'use client';
import { use } from 'react';
import { diaryEntries } from '../../../data/movies';
import styles from './DiaryDetail.module.css';
import DiaryEntry from '@/components/DiaryEntry';

export default function DiaryDetail({ params }) {
  const resolvedParams = use(params);
  const diaryEntry = diaryEntries.find(d => d.id === parseInt(resolvedParams.id));

  if (!diaryEntry) {
    return (
      <main className={styles.notFound}>
        <h1>Diary entry not found</h1>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.backdrop}>
        <div className={styles.header}>
          <div className={styles.poster}>
            {diaryEntry.poster_url
              ? <img src={diaryEntry.poster_url} alt={diaryEntry.title} className={styles.posterImage} />
              : <span className={styles.posterEmoji}>{diaryEntry.emoji}</span>
            }
          </div>

          <div className={styles.info}>
            <h1 className={styles.title}>{diaryEntry.title}</h1>
            <div className={styles.meta}>
              <span>{diaryEntry.year}</span>
              {diaryEntry.duration && <span>•</span>}
              {diaryEntry.duration && <span>{diaryEntry.duration} min</span>}
            </div>
            <p className={styles.description}>{diaryEntry.description}</p>
            <div className={styles.rating}>
              <span className={styles.reviewLabel}> your rating </span>
              <span className={styles.stars}>{diaryEntry.stars}</span>
            </div>

            <div className={styles.review}>
              <span className={styles.label}> watched on </span>
              <span className={styles.date}>{diaryEntry.month} {diaryEntry.day}, {diaryEntry.year}</span>
              <p>{diaryEntry.review || 'No review yet'}</p>
            </div>

            <div className={styles.actions}>
              <button className={styles.btn}> Edit Review</button>
              <button className={styles.btn}> Delete Entry</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}