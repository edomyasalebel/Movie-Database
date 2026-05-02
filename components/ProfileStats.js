'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ProfileStats.module.css';

export default function ProfileStats() {
  const [topGenres, setTopGenres]       = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState([]);
  const [watchTime, setWatchTime]       = useState({ hrs: 0, min: 0 });
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;

      const [diaryGenresRes, reviewsRes, watchedRes] = await Promise.all([
        supabase
          .from('watched')
          .select('movie_id, movies(movie_genres(genres(name)))')
          .eq('user_id', uid),
        supabase
          .from('reviews')
          .select('rating')
          .eq('user_id', uid),
        supabase
          .from('watched')
          .select('movies(duration_min)')
          .eq('user_id', uid),
      ]);

      // --- genre counts ---
      const genreCounts = {};
      for (const row of diaryGenresRes.data || []) {
        const movieGenres = row.movies?.movie_genres || [];
        for (const mg of movieGenres) {
          const name = mg.genres?.name;
          if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
        }
      }
      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      setTopGenres(sortedGenres);

      // --- rating breakdown ---
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const row of reviewsRes.data || []) {
        const r = row.rating;
        if (r >= 1 && r <= 5) ratingCounts[r]++;
      }
      setRatingBreakdown(Object.entries(ratingCounts).map(([star, count]) => [Number(star), count]));

      // --- watch time ---
      let totalMin = 0;
      for (const row of watchedRes.data || []) {
        const dur = row.movies?.duration_min;
        if (dur) totalMin += dur;
      }
      setWatchTime({ hrs: Math.floor(totalMin / 60), min: totalMin % 60 });

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return null;

  const maxGenreCount = topGenres[0]?.[1] || 1;
  const maxRatingCount = Math.max(...ratingBreakdown.map(([, c]) => c), 1);

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>

        {/* Top genres */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Top Genres</div>
          {topGenres.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>No data yet</div>
            : topGenres.map(([name, count]) => (
              <div key={name} className={styles.statRow}>
                <div className={styles.statLabel}>{name}</div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(count / maxGenreCount) * 100}%` }}
                  />
                </div>
                <div className={styles.statVal}>{count}</div>
              </div>
            ))
          }
        </div>

        {/* Rating breakdown */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Rating Breakdown</div>
          {ratingBreakdown.map(([star, count]) => (
            <div key={star} className={styles.statRow}>
              <div className={styles.statLabel}>{'★'.repeat(star)}</div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(count / maxRatingCount) * 100}%` }}
                />
              </div>
              <div className={styles.statVal}>{count}</div>
            </div>
          ))}
        </div>

        {/* Total watch time */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Total Watch Time</div>
          <div className={styles.watchTime}>
            {watchTime.hrs > 0 ? `${watchTime.hrs}h ${watchTime.min}m` : `${watchTime.min} min`}
          </div>
          <div className={styles.watchTimeSub}>across all logged titles</div>
        </div>

      </div>
    </div>
  );
}
