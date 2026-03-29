'use client';
import { useRouter } from 'next/navigation';
import AuthCard from '../components/AuthCard';
import styles from './page.module.css';

export default function Landing() {
  const router = useRouter();
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.heading}>Movie<em>Diary</em></h1>
        <p className={styles.sub}>Track what you watch. Rate what you love. Share what moves you.</p>
      </div>
      <AuthCard onLogin={() => router.push('/home')} />
    </main>
  );
}
