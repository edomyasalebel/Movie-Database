'use client';
import { useState, useEffect } from 'react'; // added useEffect
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import FavoriteFilms from '../../components/FavoriteFilms';
import DiaryList from '../../components/DiaryList';
import ReviewsList from '../../components/ReviewsList';
import WatchlistGrid from '../../components/WatchlistGrid';
import ListsGrid from '../../components/ListsGrid';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

const TABS = ['Overview', 'Reviews', 'Lists', 'Watchlist'];

export default function Profile() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [stats, setStats] = useState({ films: 0, reviews: 0, lists: 0, watchlist: 0 });
  const [username, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    async function checkAuth() {
      // getSession() returns the current logged in user's session
      // if null → no one is logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/'); // kick them back to login page
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('display_name , username, created_at')
        .eq('id', session.user.id)
        .single();

      const { count: filmCount } = await supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: reviewCount }   = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: listCount }     = await supabase.from('lists').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: watchlistCount} = await supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);

      // Step 3: if we got a profile, save the display_name to state
      if(profile) setStats({ films: filmCount, reviews: reviewCount, lists: listCount, watchlist: watchlistCount });
      if (profile) setDisplayName(profile.display_name);
      if(profile) setUserName(profile.username);
      // toLocaleDateString with month+year gives us "Jan 2025" in one go
      if (profile) setMemberSince(
        new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      );


    }
    checkAuth();
  }, []); // [] = run once when page first loads
  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.avatarWrap}>🎬</div>
          <div className={styles.meta}>
            <div className={styles.displayName}>{displayName}</div>
            <div className={styles.username}>@{username} · Member since {memberSince}</div>
            <div className={styles.stats}>
              {[
                [stats.films,     'Films'],
                [stats.reviews,   'Reviews'],
                [stats.lists,     'Lists'],
                [stats.watchlist, 'Watchlist'],
              ].map(([val, label]) => (
                <div key={label} className={styles.stat}>
                  <div className={styles.statVal}>{val}</div>
                  <div className={styles.statLabel}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
        <div className={styles.body}>
          {activeTab === 'Overview' && <><FavoriteFilms /><DiaryList /></>}
          {activeTab === 'Reviews' && <ReviewsList />}
          {activeTab === 'Lists' && <ListsGrid />}
          {activeTab === 'Watchlist' && <WatchlistGrid />}
        </div>
      </main>
    </>
  );
}
