'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'; // ← needed so router.push('/') works
import { supabase } from '../../../lib/supabase';
import LoadingSpinner from '../../../components/LoadingSpinner';
import styles from './DiaryDetail.module.css';


export default function DiaryDetail({ params }) {
  // useRouter gives us the router object so we can redirect programmatically
  const router = useRouter();

  // unwrap the diary entry ID from the URL
  // Next.js 15+ makes params a Promise, so we use use() to read it
  const { id } = use(params);

  const [entry, setEntry]   = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // we define one async function that does everything in the right ORDER:
    // 1. check if user is logged in
    // 2. only if they are → fetch the diary data
    async function init() {
      // STEP 1: check authentication
      // getSession() returns the currently logged-in user's session (or null)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // no session means no one is logged in → send them back to login page
        router.push('/');
        return; // stop here — don't try to fetch data for a logged-out user
      }

      // STEP 2: fetch the diary entry (only reached if user IS logged in)
      // JOIN with movies table so we get poster, title, runtime etc. in one query
      const { data: diaryData, error } = await supabase
        .from('diary')
        .select('*, movies(id, title, release_year, duration_min, country, poster_url, description, average_rating)')
        .eq('id', id)       // this specific diary entry by URL id
        .single();          // expect exactly one row back

      if (error) {
        console.error('Error fetching diary entry:', error.message);
        setLoading(false);
        return;
      }

      setEntry(diaryData);

      // STEP 3: fetch the review for this movie by this user
      // diary and reviews are separate tables — a user can have a diary entry
      // without a review, so this might come back empty (that's fine)
      // use session.user.id instead of a hardcoded ID — works for any logged-in user
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('rating, review_text')
        .eq('movie_id', diaryData.movie_id)  // same movie as the diary entry
        .eq('user_id', session.user.id)      // the actual logged-in user
        .single();

      // review might not exist — that's ok, we just show "No review yet"
      setReview(reviewData || null);
      setLoading(false);
    }

    init(); // kick off the whole sequence
  }, [id]); // re-run if the URL id changes (e.g. user navigates to a different diary entry)

  if (loading) return <LoadingSpinner />;

  if (!entry) {
    return (
      <main className={styles.notFound}>
        <h1>Diary entry not found</h1>
      </main>
    );
  }

  // shorthand for the joined movie data
  const movie = entry.movies;

  // format the watched date nicely e.g. "Mar 28, 2025"
  const watchedDate = new Date(entry.watched_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <main className={styles.container}>
      <div className={styles.backdrop}>
        <div className={styles.header}>

          {/* poster from movies table — fallback to emoji */}
          <div className={styles.poster}>
            {movie.poster_url
              ? <img src={movie.poster_url} alt={movie.title} className={styles.posterImage} />
              : <span className={styles.posterEmoji}>🎬</span>
            }
          </div>

          <div className={styles.info}>
            {/* movie title from joined movies table */}
            <h1 className={styles.title}>{movie.title}</h1>

            {/* meta — using DB field names: release_year, duration_min */}
            <div className={styles.meta}>
              <span>{movie.release_year}</span>
              {movie.duration_min && <span>•</span>}
              {movie.duration_min && <span>{movie.duration_min} min</span>}
              {movie.country && <span>•</span>}
              {movie.country && <span>{movie.country}</span>}
            </div>

            {/* movie description */}
            <p className={styles.description}>{movie.description}</p>

            {/* rating from the reviews table (separate from diary) */}
            <div className={styles.rating}>
              <span className={styles.reviewLabel}>your rating </span>
              <span className={styles.stars}>
                {review ? `⭐ ${review.rating} / 5` : 'Not rated yet'}
              </span>
            </div>

            {/* diary info: when it was watched + rewatch flag */}
            <div className={styles.review}>
              <span className={styles.label}>watched on </span>
              <span className={styles.date}>
                {watchedDate} {entry.rewatch ? '· rewatch' : ''}
              </span>

              {/* review text from reviews table */}
              <p>{review?.review_text || 'No review yet.'}</p>
            </div>

            <div className={styles.actions}>
              <button className={styles.btn}>Edit Review</button>
              <button className={styles.btn}>Delete Entry</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
