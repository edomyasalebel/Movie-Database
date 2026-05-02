'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DiaryEntry from './DiaryEntry';
import styles from './DiaryList.module.css';

export default function DiaryList() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function fetchDiary() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Step 1: fetch diary entries joined with movies (no average_rating needed anymore)
      const { data, error } = await supabase
        .from('diary')
        .select('id, watched_date, movie_id, movies(id, title, release_year, poster_url, type)')
        .eq('user_id', session.user.id)
        .order('watched_date', { ascending: false })
        .limit(5);

      if (error) { console.error('Error fetching diary:', error.message); return; }

      // Step 2: fetch the user's own ratings for these movies
      // we pull movie_ids from the diary results and look up reviews in one query
      const movieIds = data.map((e) => e.movie_id);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('movie_id, rating')
        .eq('user_id', session.user.id)
        .in('movie_id', movieIds); // .in() = WHERE movie_id IN (1, 5, 7, ...)

      // Step 3: build a lookup map { movie_id → rating } for fast access
      // instead of looping through reviewsData for every diary entry
      const ratingMap = {};
      reviewsData?.forEach((r) => { ratingMap[r.movie_id] = r.rating; });

      // Step 4: transform into shape DiaryEntry expects
      const transformed = data.map((entry) => {
        // T12:00:00 prevents UTC midnight from shifting the date back one day
        const date = new Date(entry.watched_date + 'T12:00:00');
        return {
          id:        entry.id,
          day:       date.getDate().toString(),
          month:     date.toLocaleString('default', { month: 'short' }),
          title:     entry.movies.title,
          year:      entry.movies.release_year,
          poster_url: entry.movies.poster_url,
          type:      entry.movies.type,
          emoji:     '🎬',
          stars: ratingMap[entry.movie_id]
            ? '⭐ ' + ratingMap[entry.movie_id] + ' / 5'
            : '',
        };
      });

      setEntries(transformed);
    }

    fetchDiary();
  }, []);

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Recent Diary</h3>
      <div className={styles.list}>
        {entries.length === 0
          ? <p className={styles.empty}>No diary entries yet.</p>
          : entries.map((entry) => <DiaryEntry key={entry.id} entry={entry} />)
        }
      </div>
    </div>
  );
}
