'use client';
import { useRouter } from 'next/navigation';
import AuthCard from '../components/AuthCard';
import styles from './page.module.css';

export default function Landing() {
  const router = useRouter();
  return (
    <main className={styles.main}>

      {/* floating background logos — aria-hidden so screen readers skip it */}
      <div className={styles.bg} aria-hidden="true">
        <span className={`${styles.floater} ${styles.f1}`}>Movie<em>Diary</em></span>
        <span className={`${styles.floater} ${styles.f2}`}>MD</span>
        <span className={`${styles.floater} ${styles.f3}`}>Movie<em>Diary</em></span>
        <span className={`${styles.floater} ${styles.f4}`}>MD</span>
        <span className={`${styles.floater} ${styles.f5}`}>Movie<em>Diary</em></span>
        <span className={`${styles.floater} ${styles.f6}`}>MD</span>
        <span className={`${styles.floater} ${styles.f7}`}>Movie<em>Diary</em></span>
        <span className={`${styles.floater} ${styles.f8}`}>MD</span>
      </div>

      {/* main content sits above the animated background */}
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.heading}>Movie<em>Diary</em></h1>
          <p className={styles.sub}>Track what you watch. Rate what you love. Share what moves you.</p>
        </div>
        <AuthCard onLogin={() => router.push('/home')} />
      </div>

    </main>
  );
}
