'use client';
import styles from './ProfileStrip.module.css';

export default function ProfileStrip({ onNavigate }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>
        <div className={styles.bar} />
        <h2>Your Profile</h2>
      </div>
      <div className={styles.strip} onClick={onNavigate}>
        <div className={styles.avatar}>🎬</div>
        <div className={styles.info}>
          <div className={styles.name}>Edomyas</div>
          <div className={styles.sub}>47 films · 12 reviews · 3 lists</div>
        </div>
        <span className={styles.arrow}>›</span>
      </div>
    </div>
  );
}
