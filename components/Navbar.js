'use client';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar({ onLogout }) {
  const router = useRouter();
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
        <button className={styles.navLinkMuted} onClick={onLogout}>Sign out</button>
        {/* avatar — MD initials matching the monogram */}
        <div className={styles.avatar} onClick={() => router.push('/profile')}>
          <span className={styles.avatarM}>M</span><span className={styles.avatarD}>D</span>
        </div>
      </div>

    </nav>
  );
}
