'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import PosterCard from '../../../components/PosterCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import styles from './ListDetail.module.css';

export default function ListDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [list, setList]     = useState(null);
  const [films, setFilms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchList() {
      const { data, error } = await supabase
        .from('lists')
        .select('id, title, description, is_public, created_at, users(display_name, username), list_items(position, movies(id, title, release_year, poster_url, average_rating))')
        .eq('id', id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setList(data);
      setFilms(
        [...(data.list_items || [])]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((i) => i.movies)
      );
      setLoading(false);
    }

    fetchList();
  }, [id]);

  if (loading) return <><Navbar onLogout={() => router.push('/')} /><LoadingSpinner /></>;
  if (notFound) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onLogout={() => router.push('/')} />
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--muted)' }}>List not found.</div>
    </main>
  );

  return (
    <main className={styles.page}>
      <Navbar onLogout={() => router.push('/')} />

      <div className={styles.container}>
        {/* back link */}
        <button className={styles.back} onClick={() => router.back()}>← Back</button>

        {/* list header */}
        <div className={styles.hero}>
          <div className={styles.iconWrap}>📋</div>
          <div className={styles.heroInfo}>
            <h1 className={styles.title}>{list.title}</h1>
            <div className={styles.meta}>
              <span>by <strong>{list.users?.display_name || list.users?.username}</strong></span>
              <span className={styles.dot}>·</span>
              <span>{films.length} film{films.length !== 1 ? 's' : ''}</span>
              <span className={styles.dot}>·</span>
              <span>{new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
            {list.description && <p className={styles.desc}>{list.description}</p>}
          </div>
        </div>

        <div className={styles.divider} />

        {/* film grid */}
        {films.length === 0 ? (
          <p className={styles.empty}>No films in this list yet.</p>
        ) : (
          <div className={styles.grid}>
            {films.map((movie, i) => (
              <div key={movie.id} className={styles.filmWrap}>
                <span className={styles.position}>{i + 1}</span>
                <PosterCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
