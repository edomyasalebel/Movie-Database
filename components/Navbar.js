'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import styles from './Navbar.module.css';

export default function Navbar({ onLogout }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('users').select('admin_access, avatar').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.admin_access) setIsAdmin(true);
          if (data?.avatar) setAvatar(data.avatar);
        });
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
        <button className={styles.navLink} onClick={() => router.push('/sql')}>SQL</button>
        {mounted && (
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        )}
        <button className={styles.navLinkMuted} onClick={onLogout}>Sign out</button>
        {/* avatar — shows user's chosen emoji or MD initials as fallback */}
        <div className={styles.avatar} onClick={() => router.push('/profile')}>
          {avatar
            ? <span style={{ fontSize: '18px' }}>{avatar}</span>
            : <><span className={styles.avatarM}>M</span><span className={styles.avatarD}>D</span></>
          }
        </div>
      </div>

    </nav>
  );
}
