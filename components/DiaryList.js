'use client';
import { diaryEntries } from '../data/movies';
import styles from './DiaryList.module.css';

export default function DiaryList() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Recent Diary</h3>
      <div className={styles.list}>
        {diaryEntries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            <div className={styles.date}>
              <div className={styles.day}>{entry.day}</div>
              <div className={styles.month}>{entry.month}</div>
            </div>
            <div className={styles.thumb}>{entry.emoji}</div>
            <div className={styles.info}>
              <div className={styles.entryTitle}>{entry.title}</div>
              <div className={styles.sub}>{entry.year}</div>
            </div>
            <div className={styles.stars}>{entry.stars}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
