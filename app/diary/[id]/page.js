'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Navbar from '../../../components/Navbar';
import styles from './DiaryDetail.module.css';

export default function DiaryDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [entry, setEntry]       = useState(null);
  const [review, setReview]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState(null);

  // edit mode state
  const [editing, setEditing]         = useState(false);
  const [editDate, setEditDate]       = useState('');
  const [editRewatch, setEditRewatch] = useState(false);
  const [editRating, setEditRating]   = useState('');
  const [editText, setEditText]       = useState('');
  const [saving, setSaving]           = useState(false);

  // delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      setUserId(session.user.id);

      const { data: diaryData, error } = await supabase
        .from('diary')
        .select('*, movies(id, title, release_year, duration_min, country, poster_url, description, average_rating)')
        .eq('id', id)
        .single();

      if (error) { console.error('Error fetching diary entry:', error.message); setLoading(false); return; }

      setEntry(diaryData);

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('rating, review_text')
        .eq('movie_id', diaryData.movie_id)
        .eq('user_id', session.user.id)
        .single();

      setReview(reviewData || null);
      setLoading(false);
    }
    init();
  }, [id]);

  // populate edit form fields when entering edit mode
  function startEdit() {
    setEditDate(entry.watched_date);
    setEditRewatch(entry.rewatch || false);
    setEditRating(review?.rating ?? '');
    setEditText(review?.review_text ?? '');
    setEditing(true);
  }

  // save changes to diary + review tables
  async function handleSave() {
    setSaving(true);

    // update watched_date and rewatch flag in diary table
    const { error: diaryError } = await supabase
      .from('diary')
      .update({ watched_date: editDate, rewatch: editRewatch })
      .eq('id', id);

    if (diaryError) { console.error(diaryError.message); setSaving(false); return; }

    // upsert review — creates one if it doesn't exist yet
    if (editRating !== '') {
      const { error: reviewError } = await supabase
        .from('reviews')
        .upsert({
          user_id:     userId,
          movie_id:    entry.movie_id,
          rating:      Number(editRating),
          review_text: editText.trim() || null,
        }, { onConflict: 'user_id,movie_id' });

      if (reviewError) { console.error(reviewError.message); setSaving(false); return; }
    }

    // update local state so UI reflects changes without a full reload
    setEntry((prev) => ({ ...prev, watched_date: editDate, rewatch: editRewatch }));
    setReview(editRating !== '' ? { rating: Number(editRating), review_text: editText.trim() || null } : review);
    setEditing(false);
    setSaving(false);
  }

  // delete diary entry + the user's review/rating for this movie, then redirect to profile
  async function handleDelete() {
    setDeleting(true);
    const { error: diaryError } = await supabase.from('diary').delete().eq('id', id);
    if (diaryError) { console.error(diaryError.message); setDeleting(false); return; }

    // also remove the review so the rating doesn't linger after the diary entry is gone
    await supabase.from('reviews').delete()
      .eq('user_id', userId)
      .eq('movie_id', entry.movie_id);

    router.push('/profile');
  }

  if (loading) return null;

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
      {/* Added Navbar — was missing from diary detail page */}
      <Navbar onLogout={() => router.push('/')} />
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

            {/* Edit / Delete actions — handlers added, buttons were previously non-functional */}
            {!editing && !confirmDelete && (
              <div className={styles.actions}>
                <button className={styles.btn} onClick={startEdit}>Edit Entry</button>
                <button className={styles.btnDanger} onClick={() => setConfirmDelete(true)}>Delete Entry</button>
              </div>
            )}

            {/* Inline edit form */}
            {editing && (
              <div className={styles.editForm}>
                <div className={styles.editRow}>
                  <label className={styles.editLabel}>Watched on</label>
                  <input
                    type="date"
                    className={styles.editInput}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className={styles.editRow}>
                  <label className={styles.editLabel}>
                    <input
                      type="checkbox"
                      checked={editRewatch}
                      onChange={(e) => setEditRewatch(e.target.checked)}
                    />
                    {' '}Rewatch
                  </label>
                </div>
                <div className={styles.editRow}>
                  <label className={styles.editLabel}>Rating (1–5)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    className={styles.editInput}
                    value={editRating}
                    onChange={(e) => setEditRating(e.target.value)}
                  />
                </div>
                <div className={styles.editRow}>
                  <label className={styles.editLabel}>Review</label>
                  <textarea
                    className={styles.editTextarea}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className={styles.actions}>
                  <button className={styles.btn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className={styles.btnMuted} onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Delete confirmation step */}
            {confirmDelete && (
              <div className={styles.confirmBox}>
                <p>Delete this diary entry? This cannot be undone.</p>
                <div className={styles.actions}>
                  <button className={styles.btnDanger} onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button className={styles.btnMuted} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
