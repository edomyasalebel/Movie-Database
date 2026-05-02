'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import FavoriteFilms from '../../components/FavoriteFilms';
import DiaryList from '../../components/DiaryList';
import ReviewsList from '../../components/ReviewsList';
import WatchlistGrid from '../../components/WatchlistGrid';
import WatchingGrid from '../../components/WatchingGrid';
import ListsGrid from '../../components/ListsGrid';
import AdminPanel from '../../components/AdminPanel';
import ProfileStats from '../../components/ProfileStats';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

const BASE_TABS = ['Overview', 'Reviews', 'Lists', 'Watchlist', 'Watching'];

const AVATARS = [
  '🎬','🎭','🍿','🎥','🌟','🦁','🐺','🦊','🐉','🌙',
  '⚡','🔥','🌊','🚀','👁️','🃏','🎸','🌈','🦋','🎯',
  '🌺','🐦','🦅','🎪',
];

export default function Profile() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [stats, setStats] = useState({ films: 0, reviews: 0, lists: 0, watchlist: 0, watching: 0 });
  const [username, setUserName] = useState('');
  const [isAdmin, setIsAdmin]   = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading]     = useState(true);
  const [avatar, setAvatar]       = useState('🎬');
  const [userId, setUserId]       = useState(null);

  // display name editing
  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState('');
  const [savingName, setSavingName]     = useState(false);

  // avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('users')
        .select('display_name, username, created_at, admin_access, avatar')
        .eq('id', session.user.id)
        .single();

      const [
        { count: filmCount },
        { count: reviewCount },
        { count: listCount },
        { count: watchlistCount },
        { count: watchingCount },
      ] = await Promise.all([
        supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('lists').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('watching').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('completed', false),
      ]);

      if (profile) {
        setStats({ films: filmCount, reviews: reviewCount, lists: listCount, watchlist: watchlistCount, watching: watchingCount });
        setDisplayName(profile.display_name);
        setNameInput(profile.display_name);
        setUserName(profile.username);
        setIsAdmin(!!profile.admin_access);
        setAvatar(profile.avatar || '🎬');
        setMemberSince(new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }

      setLoading(false);
    }
    checkAuth();
  }, []);

  async function saveName() {
    if (!nameInput.trim() || nameInput === displayName) { setEditingName(false); return; }
    setSavingName(true);
    const { error } = await supabase.from('users').update({ display_name: nameInput.trim() }).eq('id', userId);
    if (!error) setDisplayName(nameInput.trim());
    setSavingName(false);
    setEditingName(false);
  }

  async function pickAvatar(emoji) {
    setAvatar(emoji);
    setShowAvatarPicker(false);
    await supabase.from('users').update({ avatar: emoji }).eq('id', userId);
  }

  if (loading) return null;

  const TABS = isAdmin ? [...BASE_TABS, 'ADMIN'] : BASE_TABS;

  return (
    <>
      <Navbar onLogout={() => router.push('/')} />
      <main className={styles.main}>
        <div className={styles.hero}>

          {/* avatar with click-to-change */}
          <div className={styles.avatarArea}>
            <button className={styles.avatarWrap} onClick={() => setShowAvatarPicker(true)} title="Change avatar">
              <span className={styles.avatarEmoji}>{avatar}</span>
              <div className={styles.avatarEdit}>✎</div>
            </button>
          </div>

          <div className={styles.meta}>
            {/* editable display name */}
            <div className={styles.nameRow}>
              {editingName ? (
                <>
                  <input
                    className={styles.nameInput}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                    maxLength={40}
                  />
                  <button className={styles.nameSave} onClick={saveName} disabled={savingName}>
                    {savingName ? '…' : 'Save'}
                  </button>
                  <button className={styles.nameCancel} onClick={() => setEditingName(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className={styles.displayName}>{displayName}</span>
                  <button className={styles.nameEditBtn} onClick={() => { setNameInput(displayName); setEditingName(true); }} title="Edit name">✎</button>
                </>
              )}
            </div>

            <div className={styles.username}>@{username} · Member since {memberSince}</div>

            <div className={styles.stats}>
              {[
                [stats.films,     'Logged'],
                [stats.reviews,   'Reviews'],
                [stats.lists,     'Lists'],
                [stats.watchlist, 'Watchlist'],
                [stats.watching,  'Watching'],
              ].map(([val, label]) => (
                <div key={label} className={styles.stat}>
                  <div className={styles.statVal}>{val}</div>
                  <div className={styles.statLabel}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* avatar picker modal */}
        {showAvatarPicker && (
          <div className={styles.pickerOverlay} onClick={() => setShowAvatarPicker(false)}>
            <div className={styles.pickerCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.pickerTitle}>Choose your avatar</div>
              <div className={styles.pickerGrid}>
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`${styles.pickerBtn} ${avatar === emoji ? styles.pickerBtnActive : ''}`}
                    onClick={() => pickAvatar(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.active : ''} ${tab === 'ADMIN' ? styles.adminTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {activeTab === 'Overview'  && <><ProfileStats /><FavoriteFilms /><DiaryList /></>}
          {activeTab === 'Reviews'   && <ReviewsList />}
          {activeTab === 'Lists'     && <ListsGrid />}
          {activeTab === 'Watchlist' && <WatchlistGrid />}
          {activeTab === 'Watching'  && <WatchingGrid />}
          {activeTab === 'ADMIN'     && <AdminPanel />}
        </div>
      </main>
    </>
  );
}
