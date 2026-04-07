'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ReviewsList.module.css';

export default function ReviewsList() {
  // holds the list of reviews once fetched from DB
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    async function fetchReviews() {
      // Step 1: get the logged-in user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Step 2: fetch this user's reviews and JOIN with movies table
      // reviews table has: user_id, movie_id, rating, review_text, created_at
      // we JOIN movies so we get title, poster_url etc. in one query
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, review_text, created_at, movies(id, title, release_year, poster_url)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }); // newest reviews first

      if (error) {
        console.error('Error fetching reviews:', error.message);
        return;
      }

      setReviews(data);
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
          {reviews.map((review) => (
            <div key={review.id} className={styles.card}>

              {/* movie poster — fallback to emoji if no poster */}
              <div className={styles.poster}>
                {review.movies.poster_url
                  ? <img src={review.movies.poster_url} alt={review.movies.title} className={styles.posterImage} />
                  : <span className={styles.posterEmoji}>🎬</span>
                }
              </div>

              <div className={styles.info}>
                {/* movie title + year */}
                <div className={styles.movieTitle}>{review.movies.title}</div>
                <div className={styles.year}>{review.movies.release_year}</div>

                {/* star rating — e.g. ⭐ 4 / 5 */}
                <div className={styles.rating}>⭐ {review.rating} / 5</div>

                {/* the review text itself */}
                <p className={styles.text}>{review.review_text}</p>

                {/* when they wrote the review */}
                <div className={styles.date}>
                  {new Date(review.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
