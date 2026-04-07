'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DiaryEntry from './DiaryEntry';
import styles from './DiaryList.module.css';

export default function DiaryList() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function fetchDiary() {
      // Step 1: get the logged-in user's session INSIDE the async function
      // await can only be used inside async functions — not at the top of a file
      const { data: { session } } = await supabase.auth.getSession();

      // if no one is logged in, nothing to fetch
      if (!session) return;

      // Step 2: fetch diary entries and JOIN with movies table
      // now we use session.user.id — the actual logged-in user's ID
      const { data, error } = await supabase
        .from('diary')
        .select('id, watched_date, movies(id, title, release_year, poster_url, average_rating)')
        .eq('user_id', session.user.id)        // only this user's entries
        .order('watched_date', { ascending: false }) // most recent first
        .limit(5);                             // only show 5 on the profile

      if (error) {
        console.error('Error fetching diary:', error.message);
        return;
      }

      // transform DB data into the shape DiaryEntry expects
      // DB gives us: { id, watched_date, movies: { title, poster_url, ... } }
      // DiaryEntry expects: { id, day, month, title, year, poster_url, stars }
      const transformed = data.map((entry) => {
        const date = new Date(entry.watched_date);
        return {
          id: entry.id,
          // extract day number and short month name from the date
          day:   date.getDate().toString(),
          month: date.toLocaleString('default', { month: 'short' }),
          title:     entry.movies.title,
          year:      entry.movies.release_year,
          poster_url: entry.movies.poster_url,
          stars:     entry.movies.average_rating
            ? '⭐ ' + entry.movies.average_rating
            : '',
          emoji: '🎬', // fallback if no poster
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
        {entries.map((entry) => (
          <DiaryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
