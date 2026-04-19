'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PosterCard from '../../../components/PosterCard';
import styles from './MovieDetail.module.css';

export default function MovieDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [movie, setMovie]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [similar, setSimilar]     = useState([]);

  // tracks whether the logged-in user has already logged/reviewed this movie
  // null = not checked yet, object = existing data, false = doesn't exist
  const [existingLog, setExistingLog]       = useState(null);
  const [existingReview, setExistingReview] = useState(null);

  const [watchedStatus, setWatchedStatus]       = useState(false);
  const [onWatchlist, setOnWatchlist]           = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchedLoading, setWatchedLoading]     = useState(false);

  // modal open state
  const [modal, setModal] = useState(null);

  // form fields
  const [rating, setRating]         = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rewatch, setRewatch]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  useEffect(() => {
    async function init() {
      // fetch the movie data with genres and credits
      const { data, error } = await supabase
        .from('movies')
        .select('*, movie_genres(genres(name)), credits(role_type, character_name, people(name))')
        .eq('id', id)
        .single();

      if (error) { console.error(error); setLoading(false); return; }
      setMovie(data);

      // check if the logged-in user has already logged or reviewed this movie
      // this controls the button label (Rate & Log vs Relog) and pre-fills the form
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // check diary — has user already logged this movie?
        const { data: diaryData } = await supabase
          .from('diary')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('movie_id', id)
          .maybeSingle(); // maybeSingle = returns null instead of error if no row found

        // check reviews — has user already rated/reviewed this movie?
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('movie_id', id)
          .maybeSingle();

        setExistingLog(diaryData);       // null if not logged yet
        setExistingReview(reviewData);   // null if not reviewed yet

        const { data: watchedData } = await supabase
          .from('watched')
          .select('movie_id')
          .eq('user_id', session.user.id)
          .eq('movie_id', id)
          .maybeSingle();

        if (watchedData) setWatchedStatus(true);

        const { data: watchlistData } = await supabase
          .from('watchlist')
          .select('movie_id')
          .eq('user_id', session.user.id)
          .eq('movie_id', id)
          .maybeSingle();

        if (watchlistData) setOnWatchlist(true);
      }

      setLoading(false);

      // find similar movies by shared genres + actors from our DB
      supabase.rpc('get_similar_movies', { mid: Number(id), lim: 8 })
        .then(({ data }) => setSimilar(data || []));
    }

    init();
  }, [id]);

  // opens the modal and pre-fills form with existing data if reloogging
  function openModal() {
    // if user already logged this movie, pre-fill with their previous entry
    // so they can see what they put before and update it
    setRating(existingReview?.rating || 0);
    setReviewText(existingReview?.review_text || '');
    setWatchedDate(existingLog?.watched_date || new Date().toISOString().split('T')[0]);
    setRewatch(existingLog?.rewatch || false);
    setFormError('');
    setModal('log');
  }

  // ── submit handler ──
  // Letterboxd model: one log per movie per user, overwrite on re-log
  // rating is required, review text is optional
  async function handleLog() {
    if (rating === 0) { setFormError('Please select a rating.'); return; }
    setSubmitting(true);
    setFormError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setFormError('You must be logged in.'); setSubmitting(false); return; }

    // Step 1: upsert diary entry
    // upsert = INSERT if new, UPDATE if user_id+movie_id already exists
    // this enforces one log per movie per user — overwrites previous date/rewatch
    const { error: diaryError } = await supabase.from('diary').upsert({
      user_id:      session.user.id,
      movie_id:     Number(id),
      watched_date: watchedDate,
      rewatch,
    }, { onConflict: 'user_id,movie_id' }); // DB unique constraint handles the conflict

    if (diaryError) { setFormError(diaryError.message); setSubmitting(false); return; }

    // Step 2: upsert review
    // rating is always saved. review_text is null if user left it blank.
    // upsert overwrites previous rating/review — one review per movie per user
    const { error: reviewError } = await supabase.from('reviews').upsert({
      user_id:     session.user.id,
      movie_id:    Number(id),
      rating,
      review_text: reviewText.trim() || null,
    }, { onConflict: 'user_id,movie_id' });

    if (reviewError) { setFormError(reviewError.message); setSubmitting(false); return; }

    // update local state so button flips to "Relog" immediately without a page reload
    setExistingLog({ watched_date: watchedDate, rewatch });
    setExistingReview({ rating, review_text: reviewText.trim() || null });
    setWatchedStatus(true);
    setModal(null);
    setSubmitting(false);
  }

  if (loading) return (
    <div suppressHydrationWarning style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onLogout={() => router.push('/')} />
    </div>
  );
  if (!movie)  return <main className={styles.notFound}><Navbar onLogout={() => router.push('/')} /><h1>Movie not found</h1></main>;

  const director  = movie.credits?.find((c) => c.role_type === 'director');
  const actors    = movie.credits?.filter((c) => c.role_type === 'actor') || [];
  const genres    = movie.movie_genres?.map((mg) => mg.genres?.name).filter(Boolean) || [];

  // true if user has already logged this movie — used for button label
  const hasLogged = !!existingLog;

  return (
    <main className={styles.container}>
      <Navbar onLogout={() => router.push('/')} />

      {movie.poster_url && (
        <div className={styles.backdropWrap}>
          <div className={styles.backdropImg} style={{ backgroundImage: `url(${movie.poster_url})` }} />
          <div className={styles.backdropFade} />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.poster}>
            {movie.poster_url
              ? <img src={movie.poster_url} alt={movie.title} className={styles.posterImage} />
              : <span className={styles.posterEmoji}>🎬</span>
            }
          </div>

          <div className={styles.info}>
            {genres.length > 0 && (
              <div className={styles.genrePills}>
                {genres.map((g) => <span key={g} className={styles.genrePill}>{g}</span>)}
              </div>
            )}

            <h1 className={styles.title}>{movie.title}</h1>

            <div className={styles.meta}>
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.duration_min && <><span className={styles.dot}>·</span><span>{movie.duration_min} min</span></>}
              {movie.country      && <><span className={styles.dot}>·</span><span>{movie.country}</span></>}
            </div>

            <div className={styles.ratingRow}>
              <span className={styles.ratingVal}>⭐ {Number(movie.average_rating).toFixed(2)}</span>
              <span className={styles.ratingMax}> / 5</span>
            </div>

            {director && (
              <p className={styles.director}>Directed by <strong>{director.people?.name}</strong></p>
            )}

            <p className={styles.description}>{movie.description}</p>

            {/* show the user's existing rating below description if they've already logged */}
            {existingReview && (
              <p className={styles.yourRating}>
                Your rating: {'⭐'.repeat(existingReview.rating)} ({existingReview.rating}/5)
              </p>
            )}

            <div className={styles.actions}>
              <div className={styles.statusGroup}>
                <button
                  className={`${styles.btnToggle} ${watchedStatus ? styles.toggleActive : ''}`}
                  disabled={watchedLoading}
                  onClick={async () => {
                    setWatchedLoading(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { setWatchedLoading(false); return; }
                    if (watchedStatus) {
                      await supabase.from('watched').delete()
                        .eq('user_id', session.user.id).eq('movie_id', Number(id));
                      setWatchedStatus(false);
                    } else {
                      await supabase.from('watched').insert({ user_id: session.user.id, movie_id: Number(id) });
                      setWatchedStatus(true);
                    }
                    setWatchedLoading(false);
                  }}
                >
                  <span className={styles.btnIcon}>{watchedStatus ? '✓' : '○'}</span>
                  {watchedStatus ? 'Watched' : 'Add to Watched'}
                </button>
                <button
                  className={`${styles.btnToggle} ${onWatchlist ? styles.toggleActive : ''}`}
                  disabled={watchlistLoading}
                  onClick={async () => {
                    setWatchlistLoading(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { setWatchlistLoading(false); return; }
                    if (onWatchlist) {
                      await supabase.from('watchlist').delete()
                        .eq('user_id', session.user.id).eq('movie_id', Number(id));
                      await supabase.from('watched').delete()
                        .eq('user_id', session.user.id).eq('movie_id', Number(id));
                      setOnWatchlist(false);
                      setWatchedStatus(false);
                    } else {
                      await supabase.from('watchlist').insert({ user_id: session.user.id, movie_id: Number(id) });
                      setOnWatchlist(true);
                    }
                    setWatchlistLoading(false);
                  }}
                >
                  <span className={styles.btnIcon}>{onWatchlist ? '✓' : '+'}</span>
                  {onWatchlist ? 'On Watchlist' : 'Watchlist'}
                </button>
              </div>

              <div className={styles.actionGroup}>
                {/* label changes to "Relog" if user has already logged this movie */}
                <button className={styles.btnPrimary} onClick={openModal}>
                  {hasLogged ? '↩ Relog' : '⭐ Rate & Log'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {actors.length > 0 && (
          <div className={styles.cast}>
            <div className={styles.castLabel}>Cast</div>
            <div className={styles.castList}>
              {actors.map((a, i) => (
                <div key={i} className={styles.castItem}>
                  <div className={styles.castName}>{a.people?.name}</div>
                  {a.character_name && <div className={styles.castChar}>{a.character_name}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <div className={styles.similarSection}>
            <div className={styles.similarLabel}>
              <div className={styles.similarBar} />
              <h2>More like this</h2>
            </div>
            <div className={styles.similarRow}>
              {similar.map((m) => (
                <PosterCard key={m.id} movie={m} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── modal ── */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>

            <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>

            {/* title changes based on whether this is a first log or a relog */}
            <h2 className={styles.modalTitle}>
              {hasLogged ? '↩ Relog Film' : '⭐ Rate & Log'}
            </h2>
            <p className={styles.modalMovie}>{movie.title}</p>

            {/* if reloogging, show a note that this will overwrite their previous entry */}
            {hasLogged && (
              <p className={styles.relogNote}>
                This will overwrite your previous log and rating.
              </p>
            )}

            <label className={styles.fieldLabel}>Date watched</label>
            <input
              type="date"
              className={styles.dateInput}
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
            />

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={rewatch}
                onChange={(e) => setRewatch(e.target.checked)}
              />
              <span>This is a rewatch</span>
            </label>

            {/* rating is required — no (optional) label */}
            <label className={styles.fieldLabel}>Rating</label>
            <div className={styles.stars}>
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  className={`${styles.star} ${n <= rating ? styles.starActive : ''}`}
                  onClick={() => setRating(n === rating ? 0 : n)}
                >
                  ★
                </button>
              ))}
              {rating > 0 && <span className={styles.ratingLabel}>{rating} / 5</span>}
            </div>

            {/* review text is optional — if filled, saved to reviews table */}
            <label className={styles.fieldLabel}>
              Review <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="What did you think?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
            />

            {formError && <p className={styles.formError}>{formError}</p>}

            <button className={styles.submitBtn} onClick={handleLog} disabled={submitting}>
              {submitting ? 'Saving...' : hasLogged ? 'Update Log' : 'Log Film'}
            </button>

          </div>
        </div>
      )}
    </main>
  );
}
