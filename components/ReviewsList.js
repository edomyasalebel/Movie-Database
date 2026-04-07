'use client';
import { userReviews } from '../data/movies';
import styles from './ReviewsList.module.css';

export default function ReviewsList() {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Reviews</h3>
      {/* TODO: map over userReviews and render each one */}
      {/* each review should show: poster, movie title, year, stars, date, review text */}
    </div>
  );
}
