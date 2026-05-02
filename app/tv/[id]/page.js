// TV show detail page — same layout as movie detail but with:
// - seasons/episodes instead of runtime
// - "Currently Watching" toggle (uses the watching table) instead of "Watched"
// - season/episode progress tracker when watching
// - diary/review log works exactly like movies (whole show, not per episode)
'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import PosterCard from '../../../components/PosterCard';
import Link from 'next/link';
import styles from '../../movie/[id]/MovieDetail.module.css';
import tvStyles from './TvDetail.module.css';

export default function TvDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [show, setShow]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [similar, setSimilar]     = useState([]);

  const [existingLog, setExistingLog]       = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [onWatchlist, setOnWatchlist]       = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // currently watching state
  const [watching, setWatching]           = useState(null); // null = not watching, object = {current_season, current_episode, completed}
  const [watchingLoading, setWatchingLoading] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressSeason, setProgressSeason]     = useState(1);
  const [progressEpisode, setProgressEpisode]   = useState(1);
  const [seasonMap, setSeasonMap]               = useState({}); // { seasonNum: episodeCount }
  const [seasonMapLoading, setSeasonMapLoading] = useState(false);

  // log modal
  const [modal, setModal]         = useState(null);
  const [rating, setRating]       = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rewatch, setRewatch]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase
        .from('movies')
        .select('*, movie_genres(genres(name)), credits(role_type, character_name, people(id, name))')
        .eq('id', id)
        .eq('type', 'tv') // safety: only load TV shows on this page
        .single();

      if (error) { console.error(error); setLoading(false); return; }
      setShow(data);

      // fetch per-season episode counts from TMDB in background (non-blocking)
      if (data.tmdb_id) {
        fetch(`/api/tv/${data.tmdb_id}/seasons`)
          .then((r) => r.json())
          .then(({ seasons }) => { if (seasons) setSeasonMap(seasons); })
          .catch(() => {});
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const [{ data: diaryData }, { data: reviewData }, { data: watchlistData }, { data: watchingData }] = await Promise.all([
          supabase.from('diary').select('*').eq('user_id', session.user.id).eq('movie_id', id).maybeSingle(),
          supabase.from('reviews').select('*').eq('user_id', session.user.id).eq('movie_id', id).maybeSingle(),
          supabase.from('watchlist').select('movie_id').eq('user_id', session.user.id).eq('movie_id', id).maybeSingle(),
          supabase.from('watching').select('*').eq('user_id', session.user.id).eq('movie_id', id).maybeSingle(),
        ]);

        setExistingLog(diaryData);
        setExistingReview(reviewData);
        setOnWatchlist(!!watchlistData);
        if (watchingData) {
          setWatching(watchingData);
          setProgressSeason(watchingData.current_season);
          setProgressEpisode(watchingData.current_episode);
        }
      }

      setLoading(false);
      supabase.rpc('get_similar_movies', { mid: Number(id), lim: 8 })
        .then(({ data }) => setSimilar(data || []));
    }
    init();
  }, [id]);

  function openModal() {
    setRating(existingReview?.rating || 0);
    setReviewText(existingReview?.review_text || '');
    setWatchedDate(existingLog?.watched_date || new Date().toISOString().split('T')[0]);
    setRewatch(existingLog?.rewatch || false);
    setFormError('');
    setModal('log');
  }

  async function handleLog() {
    if (rating === 0) { setFormError('Please select a rating.'); return; }
    setSubmitting(true); setFormError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setFormError('You must be logged in.'); setSubmitting(false); return; }

    const { error: diaryError } = await supabase.from('diary').upsert({
      user_id: session.user.id, movie_id: Number(id), watched_date: watchedDate, rewatch,
    }, { onConflict: 'user_id,movie_id' });

    if (diaryError) { setFormError(diaryError.message); setSubmitting(false); return; }

    const { error: reviewError } = await supabase.from('reviews').upsert({
      user_id: session.user.id, movie_id: Number(id),
      rating, review_text: reviewText.trim() || null,
    }, { onConflict: 'user_id,movie_id' });

    if (reviewError) { setFormError(reviewError.message); setSubmitting(false); return; }

    setExistingLog({ watched_date: watchedDate, rewatch });
    setExistingReview({ rating, review_text: reviewText.trim() || null });
    setModal(null); setSubmitting(false);
  }

  // returns true if the given season+episode is the very last one for this show
  function isLastEpisode(season, episode) {
    const lastSeason = show.seasons_count;
    const lastEp = seasonMap[season]; // exact ep count for this season from TMDB
    if (!lastSeason || !lastEp) return false;
    return season === lastSeason && episode === lastEp;
  }

  // toggle: if already watching/completed → remove; if not watching → open form
  async function handleWatchingToggle() {
    setWatchingLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setWatchingLoading(false); return; }

    if (watching) {
      const { error } = await supabase.from('watching').delete()
        .eq('user_id', session.user.id).eq('movie_id', Number(id));
      if (!error) { setWatching(null); setShowProgressForm(false); }
    } else {
      setShowProgressForm(true);
    }
    setWatchingLoading(false);
  }

  // save progress — auto-marks complete if season+episode is the last possible value
  async function saveProgress() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const uid = session.user.id;
    const mid = Number(id);
    const autoCompleted = isLastEpisode(progressSeason, progressEpisode);

    await supabase.from('watching').delete().eq('user_id', uid).eq('movie_id', mid);

    const { data, error } = await supabase.from('watching').insert({
      user_id:         uid,
      movie_id:        mid,
      current_season:  progressSeason,
      current_episode: progressEpisode,
      completed:       autoCompleted,
    }).select().single();

    if (error) { console.error('Failed to save watching progress:', error.message); return; }

    setWatching(data);
    setShowProgressForm(false);
  }

  // explicit "Mark Complete" button — sets last S/E and completed flag
  async function saveCompleted() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const uid = session.user.id;
    const mid = Number(id);

    await supabase.from('watching').delete().eq('user_id', uid).eq('movie_id', mid);

    const { data, error } = await supabase.from('watching').insert({
      user_id:         uid,
      movie_id:        mid,
      current_season:  progressSeason,
      current_episode: progressEpisode,
      completed:       true,
    }).select().single();

    if (error) { console.error('Failed to mark completed:', error.message); return; }

    setWatching(data);
    setShowProgressForm(false);
  }

  if (loading) return (
    <div suppressHydrationWarning style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onLogout={() => router.push('/')} />
    </div>
  );
  if (!show) return <main className={styles.notFound}><Navbar onLogout={() => router.push('/')} /><h1>Show not found</h1></main>;

  const director = show.credits?.find((c) => c.role_type === 'director');
  const actors   = show.credits?.filter((c) => c.role_type === 'actor') || [];
  const genres   = show.movie_genres?.map((mg) => mg.genres?.name).filter(Boolean) || [];
  const hasLogged = !!existingLog;

  return (
    <main className={styles.container}>
      <Navbar onLogout={() => router.push('/')} />

      {show.poster_url && (
        <div className={styles.backdropWrap}>
          <div className={styles.backdropImg} style={{ backgroundImage: `url(${show.poster_url})` }} />
          <div className={styles.backdropFade} />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.poster}>
            {show.poster_url
              ? <img src={show.poster_url} alt={show.title} className={styles.posterImage} />
              : <span className={styles.posterEmoji}>📺</span>
            }
          </div>

          <div className={styles.info}>
            {/* TV badge + genres */}
            <div className={styles.genrePills}>
              <span className={tvStyles.tvBadge}>TV Series</span>
              {genres.map((g) => <span key={g} className={styles.genrePill}>{g}</span>)}
            </div>

            <h1 className={styles.title}>{show.title}</h1>

            <div className={styles.meta}>
              {show.release_year && <span>{show.release_year}</span>}
              {/* show seasons/episodes instead of runtime for TV shows */}
              {show.seasons_count  && <><span className={styles.dot}>·</span><span>{show.seasons_count} season{show.seasons_count !== 1 ? 's' : ''}</span></>}
              {show.episodes_count && <><span className={styles.dot}>·</span><span>{show.episodes_count} episodes</span></>}
              {show.country        && <><span className={styles.dot}>·</span><span>{show.country}</span></>}
            </div>

            <div className={styles.ratingRow}>
              <span className={styles.ratingVal}>⭐ {Number(show.average_rating).toFixed(2)}</span>
              <span className={styles.ratingMax}> / 5</span>
            </div>

            {director && (
              <p className={styles.director}>Created by <strong>{director.people?.name}</strong></p>
            )}

            <p className={styles.description}>{show.description}</p>

            {existingReview && (
              <p className={styles.yourRating}>
                Your rating: {'⭐'.repeat(existingReview.rating)} ({existingReview.rating}/5)
              </p>
            )}

            {/* progress tracker — only shown while actively watching (not completed) */}
            {watching && !watching.completed && !showProgressForm && (
              <div className={tvStyles.progressBar}>
                <span className={tvStyles.progressLabel}>Watching</span>
                <span className={tvStyles.progressVal}>S{watching.current_season} · E{watching.current_episode}</span>
                <button className={tvStyles.updateBtn} onClick={() => setShowProgressForm(true)}>Update</button>
              </div>
            )}

            {/* progress form — hidden when completed */}
            {showProgressForm && !watching?.completed && (() => {
              const maxEps = seasonMap[progressSeason] || null;
              const willAutoComplete = isLastEpisode(progressSeason, progressEpisode);
              return (
                <div className={tvStyles.progressForm}>
                  <div className={tvStyles.progressInputs}>
                    <div className={tvStyles.progressField}>
                      <label className={tvStyles.progressFieldLabel}>
                        Season {show.seasons_count ? `(1–${show.seasons_count})` : ''}
                      </label>
                      <input
                        type="number" min="1" max={show.seasons_count || 99}
                        className={tvStyles.progressInput}
                        value={progressSeason}
                        onChange={(e) => {
                          const s = Math.max(1, Math.min(Number(e.target.value), show.seasons_count || 99));
                          setProgressSeason(s);
                          const newMax = seasonMap[s];
                          if (newMax) setProgressEpisode((ep) => Math.min(ep, newMax));
                        }}
                      />
                    </div>
                    <div className={tvStyles.progressField}>
                      <label className={tvStyles.progressFieldLabel}>
                        Episode {maxEps ? `(1–${maxEps})` : ''}
                      </label>
                      <input
                        type="number" min="1" max={maxEps || undefined}
                        className={tvStyles.progressInput}
                        value={progressEpisode}
                        onChange={(e) => {
                          const ep = Math.max(1, maxEps
                            ? Math.min(Number(e.target.value), maxEps)
                            : Number(e.target.value));
                          setProgressEpisode(ep);
                        }}
                      />
                    </div>
                  </div>
                  {willAutoComplete && (
                    <p className={tvStyles.autoCompleteHint}>This is the final episode — will be marked as completed.</p>
                  )}
                  <div className={tvStyles.progressActions}>
                    <button className={tvStyles.saveBtn} onClick={saveProgress}>Save Progress</button>
                    <button className={tvStyles.completeBtn} onClick={saveCompleted}>Mark Complete</button>
                    <button className={tvStyles.cancelBtn} onClick={() => setShowProgressForm(false)}>Cancel</button>
                  </div>
                </div>
              );
            })()}

            <div className={styles.actions}>
              <div className={styles.statusGroup}>
                <button
                  className={`${styles.btnToggle} ${watching?.completed ? tvStyles.completedBtn : (watching || showProgressForm) ? styles.toggleActive : ''}`}
                  disabled={watchingLoading}
                  onClick={handleWatchingToggle}
                >
                  <span className={styles.btnIcon}>{watching?.completed ? '✓' : watching ? '▶' : '▷'}</span>
                  {watching?.completed
                    ? 'Completed'
                    : watching
                    ? `Watching · S${watching.current_season} E${watching.current_episode}`
                    : showProgressForm ? 'Watching…'
                    : 'Mark as Watching'}
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
                      setOnWatchlist(false);
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
                <button className={styles.btnPrimary} onClick={openModal}>
                  {hasLogged ? '↩ Re-review' : '⭐ Rate & Review'}
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
                  <div className={styles.castName}>
                    {a.people?.id
                      ? <Link href={`/person/${a.people.id}`}>{a.people.name}</Link>
                      : a.people?.name
                    }
                  </div>
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
              {similar.map((m) => <PosterCard key={m.id} movie={m} />)}
            </div>
          </div>
        )}
      </div>

      {/* log/review modal — same as movie, label changed to "Review Show" */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>
            <h2 className={styles.modalTitle}>{hasLogged ? '↩ Re-review Show' : '⭐ Rate & Review'}</h2>
            <p className={styles.modalMovie}>{show.title}</p>
            {hasLogged && <p className={styles.relogNote}>This will overwrite your previous review.</p>}

            <label className={styles.fieldLabel}>Date watched / finished</label>
            <input type="date" className={styles.dateInput} value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} />

            <label className={styles.checkRow}>
              <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
              <span>This is a rewatch</span>
            </label>

            <label className={styles.fieldLabel}>Rating</label>
            <div className={styles.stars}>
              {[1,2,3,4,5].map((n) => (
                <button key={n}
                  className={`${styles.star} ${n <= rating ? styles.starActive : ''}`}
                  onClick={() => setRating(n === rating ? 0 : n)}>★</button>
              ))}
              {rating > 0 && <span className={styles.ratingLabel}>{rating} / 5</span>}
            </div>

            <label className={styles.fieldLabel}>Review <span className={styles.optional}>(optional)</span></label>
            <textarea className={styles.textarea} placeholder="What did you think of the show?"
              value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} />

            {formError && <p className={styles.formError}>{formError}</p>}
            <button className={styles.submitBtn} onClick={handleLog} disabled={submitting}>
              {submitting ? 'Saving...' : hasLogged ? 'Update Review' : 'Log Show'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
