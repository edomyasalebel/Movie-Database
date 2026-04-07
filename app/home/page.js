'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import TrendingRow from '../../components/TrendingRow';
import TopRatedList from '../../components/TopRatedList';
import ProfileStrip from '../../components/ProfileStrip';
import LoadingSpinner from '../../components/LoadingSpinner'; // our reusable spinner
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // trending = most recently added movies
      const { data: trendingData } = await supabase
        .from('movies')
        .select('*')
        .order('id', { ascending: false })
        .limit(8);

      // top rated = highest average rating
      const { data: topRatedData } = await supabase
        .from('movies')
        .select('*')
        .order('average_rating', { ascending: false })
        .limit(8);

      setTrending(trendingData || []);
      setTopRated(topRatedData || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  // show spinner while data is being fetched from Supabase
  if (loading) {
    return (
      <>
        <Navbar onLogout={() => router.push('/')} />
        <main className={styles.main}>
          <LoadingSpinner />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>
        <TrendingRow movies={trending} />
        <div className={styles.divider} />
        <TopRatedList movies={topRated} />
        <div className={styles.divider} />
        <ProfileStrip onNavigate={() => router.push('/profile')} />
      </main>
    </>
  );
}
