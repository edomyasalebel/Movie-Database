'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import styles from './DiaryDetail.module.css';

export default function DiaryDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [entry, setEntry]     = useState(null);
  const [review, setReview]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState(null);

  // edit state
  const [editing, setEditing]         = useState(false);
  const [editDate, setEditDate]       = useState('');
  const [editRewatch, setEditRewatch] = useState(false);
  const [editRating, setEditRating]   = useState('');
  const [editText, setEditText]       = useState('');
  const [saving, setSaving]           = useState(false);

  // delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUserId(session.user.id);

      const { data: diaryData, error } = await supabase
        .from('diary')
        .select('*, movies(id, title, release_year, duration_min, country, poster_url, backdrop_url, description, average_rating, type)')
        .eq('id', id)
        .single();

      if (error) { console.error(error.message); setLoading(false); return; }
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

  function startEdit() {
    setEditDate(entry.watched_date);
    setEditRewatch(entry.rewatch || false);
    setEditRating(review?.rating ?? '');
    setEditText(review?.review_text ?? '');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error: diaryError } = await supabase
      .from('diary')
      .update({ watched_date: editDate, rewatch: editRewatch })
      .eq('id', id);

    if (diaryError) { console.error(diaryError.message); setSaving(false); return; }

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

    setEntry((prev) => ({ ...prev, watched_date: editDate, rewatch: editRewatch }));
    setReview(editRating !== '' ? { rating: Number(editRating), review_text: editText.trim() || null } : review);
    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('diary').delete().eq('id', id);
    if (error) { console.error(error.message); setDeleting(false); return; }
    await supabase.from('reviews').delete().eq('user_id', userId).eq('movie_id', entry.movie_id);
    router.push('/profile');
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar onLogout={() => router.push('/')} />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className={styles.page}>
        <Navbar onLogout={() => router.push('/')} />
        <div className={styles.notFound}>
          <h1>Entry not found</h1>
          <p>This diary entry doesn't exist or was deleted.</p>
          <Link href="/profile" className={styles.btn} style={{ marginTop: 8 }}>← Back to profile</Link>
        </div>
      </div>
    );
  }

  const movie = entry.movies;

  // best image for the blurred hero — backdrop first, then poster
  const heroSrc = movie.backdrop_url || movie.poster_url;

  // build a star string e.g. "★★★★☆" for rating 4/5
  function buildStars(rating) {
    const full  = Math.round(rating);
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
  }

  const watchedDate = new Date(entry.watched_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // route back to the right detail page (movie or tv)
  const detailHref = movie.type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <div className={styles.page}>
      <Navbar onLogout={() => router.push('/')} />

      {/* ── blurred hero backdrop ── */}
      <div className={styles.hero}>
        {heroSrc
          ? <img src={heroSrc} alt="" className={styles.heroImg} aria-hidden="true" />
          : <div className={styles.heroFallback} />
        }
        <div className={styles.heroGradient} />
      </div>

      {/* ── main content ── */}
      <div className={styles.content}>

        {/* poster + info row */}
        <div className={styles.top}>

          {/* poster */}
          <div className={styles.poster}>
            {movie.poster_url
              ? <img src={movie.poster_url} alt={movie.title} className={styles.posterImage} />
              : '🎬'
            }
          </div>

          {/* title + meta */}
          <div className={styles.info}>
            <Link href="/profile" className={styles.backLink}>← Diary</Link>

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{movie.title}</h1>
              {entry.rewatch && <span className={styles.rewatchBadge}>Rewatch</span>}
            </div>

            <div className={styles.meta}>
              <span>{movie.release_year}</span>
              {movie.duration_min && <><span className={styles.metaDot}>·</span><span>{movie.duration_min} min</span></>}
              {movie.country      && <><span className={styles.metaDot}>·</span><span>{movie.country}</span></>}
              {movie.type === 'tv' && <><span className={styles.metaDot}>·</span><span>TV Series</span></>}
            </div>

            {movie.description && (
              <p className={styles.description}>{movie.description}</p>
            )}
          </div>
        </div>

        {/* ── log card: date + rating ── */}
        {!editing && (
          <div className={styles.logCard}>
            <div className={styles.logField}>
              <div className={styles.logLabel}>Watched on</div>
              <div className={styles.logValue}>{watchedDate}</div>
            </div>
            <div className={styles.logField}>
              <div className={styles.logLabel}>Your rating</div>
              {review
                ? <div className={styles.ratingStars}>{buildStars(review.rating)} &nbsp;{review.rating} / 5</div>
                : <div className={styles.logValue} style={{ color: 'var(--muted)' }}>Not rated</div>
              }
            </div>
          </div>
        )}

        {/* ── review card ── */}
        {!editing && (
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardLabel}>Review</div>
            {review?.review_text
              ? <p className={styles.reviewText}>{review.review_text}</p>
              : <p className={styles.noReview}>No review written yet.</p>
            }
          </div>
        )}

        {/* ── action buttons ── */}
        {!editing && !confirmDelete && (
          <div className={styles.actions}>
            <button className={styles.btn} onClick={startEdit}>Edit Entry</button>
            <button className={styles.btnDanger} onClick={() => setConfirmDelete(true)}>Delete Entry</button>
          </div>
        )}

        {/* ── edit form ── */}
        {editing && (
          <div className={styles.editCard}>
            <div className={styles.editCardLabel}>Edit Entry</div>

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
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editRewatch}
                  onChange={(e) => setEditRewatch(e.target.checked)}
                />
                Rewatch
              </label>
            </div>

            <div className={styles.editRow}>
              <label className={styles.editLabel}>Rating (1 – 5)</label>
              <input
                type="number"
                min="1" max="5"
                className={styles.editInput}
                value={editRating}
                onChange={(e) => setEditRating(e.target.value)}
                style={{ maxWidth: 120 }}
              />
            </div>

            <div className={styles.editRow}>
              <label className={styles.editLabel}>Review</label>
              <textarea
                className={styles.editTextarea}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                placeholder="What did you think?"
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.btn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button className={styles.btnMuted} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── delete confirmation ── */}
        {confirmDelete && (
          <div className={styles.confirmCard}>
            <p>Delete this diary entry? This will also remove your rating and review. This cannot be undone.</p>
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
  );
}
