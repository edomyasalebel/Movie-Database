'use client';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar({ onLogout }) {
  const router = useRouter();
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo} onClick={() => router.push('/home')}>Movie<em>Diary</em></div>
      <div className={styles.navRight}>
        <button className={styles.navLink} onClick={() => router.push('/home')}>Home</button>
        <button className={styles.navLink} onClick={() => router.push('/profile')}>Profile</button>
        <button className={styles.navLink} onClick={() => router.push('/browse')}>Browse</button>
        <button className={styles.navLinkMuted} onClick={onLogout}>Sign out</button>
        <div className={styles.avatar} onClick={() => router.push('/profile')}>🎬</div>
      </div>
    </nav>
  );
}
