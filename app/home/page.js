'use client';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import TrendingRow from '../../components/TrendingRow';
import TopRatedList from '../../components/TopRatedList';
import ProfileStrip from '../../components/ProfileStrip';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>
        <TrendingRow />
        <div className={styles.divider} />
        <TopRatedList />
        <div className={styles.divider} />
        <ProfileStrip onNavigate={() => router.push('/profile')} />
      </main>
    </>
  );
}
