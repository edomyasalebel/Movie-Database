'use client';
import { userLists } from '../data/movies';
import styles from './ListsGrid.module.css';

export default function ListsGrid() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Lists</h3>
      {/* TODO: map over userLists and render each one */}
      {/* each list should show: cover image, list title, film count, description */}
    </div>
  );
}
