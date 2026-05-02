'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import styles from './WatchingGrid.module.css';

function ShowCard({ row }) {
  const show = row.movies;
  const totalEps = show.episodes_count || null;
  return (
    <Link href={`/tv/${show.id}`} className={`${styles.card} ${row.completed ? styles.cardCompleted : ''}`}>
      <div className={styles.poster}>
        {show.poster_url
          ? <img src={show.poster_url} alt={show.title} className={styles.posterImg} />
          : <span className={styles.posterFallback}>📺</span>
        }
        {row.completed && <div className={styles.completedOverlay}>✓</div>}
      </div>
      <div className={styles.info}>
        <div className={styles.title}>{show.title}</div>
        <div className={styles.year}>{show.release_year}</div>
        <div className={styles.progress}>
          <span className={`${styles.progressBadge} ${row.completed ? styles.progressBadgeDone : ''}`}>
            {row.completed ? 'Completed' : `S${row.current_season} · E${row.current_episode}`}
          </span>
          {!row.completed && show.seasons_count && (
            <span className={styles.progressOf}>
              of {show.seasons_count} season{show.seasons_count !== 1 ? 's' : ''}
              {totalEps ? `, ${totalEps} eps` : ''}
            </span>
          )}
        </div>
        {show.seasons_count && (
          <div className={styles.barWrap}>
            <div
              className={`${styles.bar} ${row.completed ? styles.barDone : ''}`}
              style={{ width: row.completed ? '100%' : `${Math.min(100, Math.round((row.current_season / show.seasons_count) * 100))}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

export default function WatchingGrid() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('watching')
        .select('current_season, current_episode, completed, movies(id, title, poster_url, seasons_count, episodes_count, release_year)')
        .eq('user_id', session.user.id);

      setShows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return null;

  const watching   = shows.filter((r) => !r.completed);
  const completed  = shows.filter((r) => r.completed);

  return (
    <div className={styles.wrapper}>
      <div className={styles.section}>
        <h3 className={styles.heading}>
          <span className={styles.headingDot} />
          Currently Watching
          {watching.length > 0 && <span className={styles.count}>{watching.length}</span>}
        </h3>
        {watching.length === 0
          ? <p className={styles.empty}>No shows in progress. Go find something to watch!</p>
          : <div className={styles.list}>{watching.map((r) => <ShowCard key={r.movies.id} row={r} />)}</div>
        }
      </div>

      <div className={styles.section}>
        <h3 className={styles.heading}>
          <span className={`${styles.headingDot} ${styles.headingDotGreen}`} />
          Completed
          {completed.length > 0 && <span className={`${styles.count} ${styles.countGreen}`}>{completed.length}</span>}
        </h3>
        {completed.length === 0
          ? <p className={styles.empty}>Nothing finished yet.</p>
          : <div className={styles.list}>{completed.map((r) => <ShowCard key={r.movies.id} row={r} />)}</div>
        }
      </div>
    </div>
  );
}
