'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import styles from './Navbar.module.css';

export default function Navbar({ onLogout }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('users').select('admin_access').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.admin_access) setIsAdmin(true); });
    });
  }, []);
  return (
    <nav className={styles.navbar}>

      {/* logo — MD monogram mark + wordmark text side by side */}
      <div className={styles.logoWrap} onClick={() => router.push('/home')}>
        {/* small square monogram badge — same design language as the site */}
        <div className={styles.monogram}>
          <span className={styles.monogramM}>M</span>
          <span className={styles.monogramD}>D</span>
        </div>
        {/* wordmark */}
        <span className={styles.logo}>Movie<em>Diary</em></span>
      </div>

      <div className={styles.navRight}>
        <button className={styles.navLink} onClick={() => router.push('/home')}>Home</button>
        <button className={styles.navLink} onClick={() => router.push('/browse')}>Browse</button>
        <button className={styles.navLink} onClick={() => router.push('/profile')}>Profile</button>
        {isAdmin && <button className={styles.navLink} onClick={() => router.push('/sql')}>SQL</button>}
        <button className={styles.navLinkMuted} onClick={onLogout}>Sign out</button>
        {/* avatar — MD initials matching the monogram */}
        <div className={styles.avatar} onClick={() => router.push('/profile')}>
          <span className={styles.avatarM}>M</span><span className={styles.avatarD}>D</span>
        </div>
      </div>

    </nav>
  );
}
