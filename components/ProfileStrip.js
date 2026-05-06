'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ProfileStrip.module.css';

export default function ProfileStrip({ onNavigate }) {
  // this will hold the display name once we fetch it from the DB
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('🎬');
  const [stats, setStats] = useState({ films: 0, reviews: 0, lists: 0, watchlist: 0 });

  useEffect(() => {
    async function fetchUser() {
      // Step 1: get the currently logged-in user's session
      // session.user.id is their unique auth UUID
      const { data: { session } } = await supabase.auth.getSession();

      // if no one is logged in, nothing to show
      if (!session) return;

      // Step 2: use that UUID to look up their row in our public.users table
      // .eq('id', session.user.id) → WHERE id = <logged in user's id>
      // .single() → we expect exactly one row back
      const { data: profile } = await supabase
        .from('users')
        .select('display_name, avatar')
        .eq('id', session.user.id)
        .single();

      const { count: filmCount } = await supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: reviewCount }   = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: listCount }     = await supabase.from('lists').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: watchlistCount} = await supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);

      // Step 3: if we got a profile, save the display_name to state
      if (profile) {
        setDisplayName(profile.display_name);
        if (profile.avatar) setAvatar(profile.avatar);
        setStats({ films: filmCount, reviews: reviewCount, lists: listCount, watchlist: watchlistCount });
      }
    }

    fetchUser();
  }, []); // [] = run once when this component first appears on screen

  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>
        <div className={styles.bar} />
        <h2>Your Profile</h2>
      </div>
      <div className={styles.strip} onClick={onNavigate}>
        <div className={styles.avatar}>{avatar}</div>
        <div className={styles.info}>
          {/* displayName starts as '' so it shows nothing until the fetch completes */}
          <div className={styles.name}>{displayName}</div>
          <div className={styles.sub}>{stats.films} logged · {stats.reviews} reviews · {stats.lists} lists</div>
        </div>
        <span className={styles.arrow}>›</span>
      </div>
    </div>
  );
}
