'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import styles from './ReviewsList.module.css';

export default function ReviewsList() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    async function fetchReviews() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // fetch reviews + joined movie data
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, review_text, created_at, movies(id, title, release_year, poster_url, type)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) { console.error('Error fetching reviews:', error.message); return; }

      // also fetch diary entries so we can link each card to /diary/[diary_id]
      const { data: diaryData } = await supabase
        .from('diary')
        .select('id, movie_id')
        .eq('user_id', session.user.id);

      // build a movie_id → diary entry id lookup map
      const diaryMap = {};
      (diaryData || []).forEach((d) => { diaryMap[d.movie_id] = d.id; });

      // attach diary_id to each review so the card can link to it
      setReviews((data || []).map((r) => ({ ...r, diary_id: diaryMap[r.movies?.id] ?? null })));
    }

    fetchReviews();
  }, []);

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Reviews</h3>
      {reviews.length === 0 ? (
        <p className={styles.empty}>No reviews yet.</p>
      ) : (
        <div className={styles.list}>
          {reviews.map((review) => {
            // if we have a diary entry id, card links to /diary/[id]; otherwise non-clickable
            const CardEl = review.diary_id ? Link : 'div';
            const cardProps = review.diary_id
              ? { href: `/diary/${review.diary_id}`, className: styles.card }
              : { className: styles.card };

            return (
              <CardEl key={review.id} {...cardProps}>
                {/* movie poster */}
                <div className={styles.poster}>
                  {review.movies.poster_url
                    ? <img src={review.movies.poster_url} alt={review.movies.title} className={styles.posterImage} loading="lazy" />
                    : <span className={styles.posterEmoji}>🎬</span>
                  }
                </div>

                <div className={styles.info}>
                  <div className={styles.movieTitle}>{review.movies.title}</div>
                  <div className={styles.year}>
                    {review.movies.release_year}
                    <span className={review.movies.type === 'tv' ? styles.tvBadge : styles.filmBadge}>
                      {review.movies.type === 'tv' ? 'TV' : 'Film'}
                    </span>
                  </div>

                  <div className={styles.rating}>⭐ {review.rating} / 5</div>

                  <p className={styles.text}>{review.review_text}</p>

                  <div className={styles.date}>
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                </div>

                {/* arrow hint — only shown when card is clickable */}
                {review.diary_id && (
                  <div className={styles.arrow}>›</div>
                )}
              </CardEl>
            );
          })}
        </div>
      )}
    </div>
  );
}
