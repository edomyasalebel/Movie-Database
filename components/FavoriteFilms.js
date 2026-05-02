'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import styles from './FavoriteFilms.module.css';

// max number of favorites allowed — Letterboxd-style fixed 5 slots
const MAX_FAVORITES = 5;

export default function FavoriteFilms() {
  const router = useRouter();

  const [favorites, setFavorites]   = useState([]);  // current favorite movies
  const [watched, setWatched]       = useState([]);   // all watched movies (for the picker)
  const [showPicker, setShowPicker]           = useState(false); // whether picker modal is open
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);  // movie id pending removal confirm
  const [removing, setRemoving]               = useState(false); // true while delete request is in flight
  const [adding, setAdding]                   = useState(false); // true while insert request is in flight
  const [error, setError]                     = useState('');    // surface DB errors to the user
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // fetch up to 5 favorites joined with movie data
    const { data, error } = await supabase
      .from('favorites')
      .select('movie_id, movies(id, title, release_year, poster_url, type)')
      .eq('user_id', session.user.id)
      .limit(MAX_FAVORITES);

    if (error) { console.error('Error fetching favorites:', error.message); }

    // flatten into just the movie objects
    setFavorites(data?.map((f) => f.movies) || []);
    setLoading(false);
  }

  // opens the picker — fetches watched movies not already in favorites
  async function openPicker() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // fetch all watched movies for this user
    const { data: watchedData } = await supabase
      .from('watched')
      .select('movie_id, movies(id, title, release_year, poster_url)')
      .eq('user_id', session.user.id);

    // filter out movies already in favorites so user can't double-add
    const favoriteIds = new Set(favorites.map((m) => m.id));
    const available = watchedData
      ?.map((w) => w.movies)
      .filter((m) => !favoriteIds.has(m.id)) || [];

    setWatched(available);
    setShowPicker(true);
  }

  // adds a movie to the favorites table in Supabase, then re-fetches the list
  async function addFavorite(movie) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // enforce max 5 at the application level too (DB shouldn't allow it either)
    if (favorites.length >= MAX_FAVORITES) return;

    setAdding(true);
    setError('');

    const { error: insertError } = await supabase.from('favorites').insert({
      user_id:  session.user.id,
      movie_id: movie.id,
    });

    if (insertError) {
      // surface the error so it's visible — most common cause: missing INSERT RLS policy
      console.error('Failed to add favorite:', insertError.message);
      setError('Could not add favorite. ' + insertError.message);
      setAdding(false);
      return; // bail out — don't close picker or refresh if DB write failed
    }

    setShowPicker(false);
    setAdding(false);
    fetchFavorites(); // re-fetch so the new poster appears immediately
  }

  // removes a movie from the favorites table in Supabase, then updates local state
  async function removeFavorite(movieId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setRemoving(true);
    setError('');

    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', session.user.id)
      .eq('movie_id', movieId);

    if (deleteError) {
      // surface the error — most common cause: missing DELETE RLS policy on favorites
      console.error('Failed to remove favorite:', deleteError.message);
      setError('Could not remove favorite. ' + deleteError.message);
      setRemoving(false);
      return; // bail out — keep the card in UI since DB delete failed
    }

    // only remove from local state after DB confirms the delete succeeded
    setFavorites((prev) => prev.filter((m) => m.id !== movieId));
    setRemoving(false);
  }

  // build an array of exactly 5 slots — filled or empty
  // [movie, movie, null, null, null] → 2 filled + 3 empty slots
  const slots = [
    ...favorites,
    ...Array(MAX_FAVORITES - favorites.length).fill(null),
  ];

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Favorites</h3>

      <div className={styles.row}>
        {slots.map((movie, i) =>
          movie ? (
            // filled slot — shows poster, navigates to movie on click
            <div
              key={movie.id}
              className={styles.card}
              onClick={() => router.push(movie.type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`)}
            >
              {movie.poster_url
                ? <img src={movie.poster_url} alt={movie.title} className={styles.posterImg} />
                : <span className={styles.emoji}>🎬</span>
              }
              {/* title overlay at the bottom */}
              <div className={styles.label}>{movie.title}</div>

              {/* remove button — small × in top right corner */}
              <button
                className={styles.removeBtn}
                onClick={(e) => {
                  e.stopPropagation();         // prevent navigating to movie page
                  setConfirmRemoveId(movie.id); // open the confirm dialog instead of deleting immediately
                }}
              >
                ×
              </button>
            </div>
          ) : (
            // empty slot — shows + to add a new favorite
            // guard: don't open picker if any modal is currently active
            // (prevents ghost-click pass-through when a modal backdrop disappears)
            <div
              key={`empty-${i}`}
              className={`${styles.card} ${styles.emptySlot}`}
              onClick={confirmRemoveId || showPicker ? undefined : openPicker}
            >
              <span className={styles.addIcon}>+</span>
            </div>
          )
        )}
      </div>

      {/* ── confirm remove modal ── */}
      {/* backdrop does NOT dismiss on click — destructive actions should require explicit Cancel/Remove */}
      {/* this also prevents ghost-clicks on the empty slot that appears behind the backdrop */}
      {confirmRemoveId && (
        <div className={styles.overlay}>
          {/* stopPropagation on the card keeps clicks inside the dialog contained */}
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmTitle}>Remove Favorite?</p>
            <p className={styles.confirmSub}>
              This will be removed from your five favorites. You can add it back anytime.
            </p>
            {/* show DB error if the delete was rejected (e.g. missing RLS policy) */}
            {error && <p className={styles.confirmError}>{error}</p>}

            <div className={styles.confirmBtns}>
              <button
                className={styles.cancelBtn}
                onClick={(e) => { e.stopPropagation(); setError(''); setConfirmRemoveId(null); }}
              >
                Cancel
              </button>
              <button
                className={styles.deleteBtn}
                disabled={removing}
                onClick={async (e) => {
                  e.stopPropagation();
                  await removeFavorite(confirmRemoveId); // wait for DB delete to confirm
                  // only close the dialog if remove succeeded (removeFavorite sets error on fail)
                  if (!error) setConfirmRemoveId(null);
                }}
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── movie picker modal ── */}
      {showPicker && (
        <div className={styles.overlay} onClick={() => setShowPicker(false)}>
          <div className={styles.pickerCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => { setShowPicker(false); setError(''); }}>✕</button>
            <h3 className={styles.pickerTitle}>Add to Favorites</h3>
            <p className={styles.pickerSub}>Choose from your watched titles</p>
            {/* show DB error if the insert was rejected */}
            {error && <p className={styles.confirmError}>{error}</p>}

            {watched.length === 0 ? (
              // user hasn't watched anything yet (or all watched movies are already favorites)
              <p className={styles.pickerEmpty}>
                No watched titles available to add.
              </p>
            ) : (
              <div className={styles.pickerList}>
                {watched.map((movie) => (
                  <div
                    key={movie.id}
                    className={`${styles.pickerItem} ${adding ? styles.pickerDisabled : ''}`}
                    onClick={() => !adding && addFavorite(movie)}
                  >
                    {/* small poster thumbnail */}
                    <div className={styles.pickerThumb}>
                      {movie.poster_url
                        ? <img src={movie.poster_url} alt={movie.title} className={styles.pickerImg} />
                        : <span>🎬</span>
                      }
                    </div>
                    <div className={styles.pickerInfo}>
                      <div className={styles.pickerName}>{movie.title}</div>
                      <div className={styles.pickerYear}>{movie.release_year}</div>
                    </div>
                    <span className={styles.pickerAdd}>+</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
