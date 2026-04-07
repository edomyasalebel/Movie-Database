'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ProfileStrip.module.css';

export default function ProfileStrip({ onNavigate }) {
  // this will hold the display name once we fetch it from the DB
  const [displayName, setDisplayName] = useState('');

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
        .select('display_name')
        .eq('id', session.user.id)
        .single();

      // Step 3: if we got a profile, save the display_name to state
      if (profile) setDisplayName(profile.display_name);
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
        <div className={styles.avatar}>🎬</div>
        <div className={styles.info}>
          {/* displayName starts as '' so it shows nothing until the fetch completes */}
          <div className={styles.name}>{displayName}</div>
          <div className={styles.sub}>47 films · 12 reviews · 3 lists</div>
        </div>
        <span className={styles.arrow}>›</span>
      </div>
    </div>
  );
}
