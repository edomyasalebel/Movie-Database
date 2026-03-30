'use client';
import { diaryEntries } from '../data/movies';
import DiaryEntry from './DiaryEntry';
import styles from './DiaryList.module.css';

export default function DiaryList() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Recent Diary</h3>
      <div className={styles.list}>
        {diaryEntries.map((entry) => (
          <DiaryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
