'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import FavoriteFilms from '../../components/FavoriteFilms';
import DiaryList from '../../components/DiaryList';
import styles from './page.module.css';

const TABS = ['Overview', 'Reviews', 'Lists', 'Watchlist',];

export default function Profile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.avatarWrap}>🎬</div>
          <div className={styles.meta}>
            <div className={styles.displayName}>Edomyas</div>
            <div className={styles.username}>@edomyas · Member since 2025</div>
            <div className={styles.stats}>
              {[['47','Films'],['12','Reviews'],['3','Lists'],['8','Watchlist']].map(([val, label]) => (
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
          {activeTab === 'Reviews' && <p className={styles.empty}>Your reviews will appear here.</p>}
          {activeTab === 'Lists' && <p className={styles.empty}>Your lists will appear here.</p>}
          {activeTab === 'Watchlist' && <p className={styles.empty}>Your watchlist will appear here.</p>}
        </div>
      </main>
    </>
  );
}
