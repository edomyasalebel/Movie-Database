'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import PosterCard from './PosterCard';
import styles from './ListsGrid.module.css';

export default function ListsGrid() {
  const [lists, setLists]       = useState([]);
  const [modal, setModal]       = useState(null); // 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const [movieQuery, setMovieQuery]     = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [pickedMovies, setPickedMovies] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => { fetchLists(); }, []);

  useEffect(() => {
    if (!movieQuery.trim()) { setMovieResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('movies')
        .select('id, title, release_year, poster_url')
        .ilike('title', `%${movieQuery}%`)
        .limit(6);
      setMovieResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [movieQuery]);

  async function fetchLists() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('lists')
      .select('id, title, description, created_at, list_items(position, movies(id, title, release_year, poster_url, average_rating))')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      // sort each list's films by position
      setLists(data.map((l) => ({
        ...l,
        films: [...(l.list_items || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((i) => i.movies),
      })));
    }
  }

  function addMovie(movie) {
    if (pickedMovies.find((m) => m.id === movie.id)) return;
    setPickedMovies((prev) => [...prev, movie]);
    setMovieQuery('');
    setMovieResults([]);
  }

  function removeMovie(id) {
    setPickedMovies((prev) => prev.filter((m) => m.id !== id));
  }

  function openCreate() {
    setTitle(''); setDesc(''); setError('');
    setPickedMovies([]); setMovieQuery(''); setMovieResults([]);
    setModal('create');
  }

  async function openEdit(list) {
    setSelected(list);
    setTitle(list.title);
    setDesc(list.description || '');
    setError('');
    setMovieQuery(''); setMovieResults([]);
    setPickedMovies(list.films || []);
    setModal('edit');
  }

  function openDelete(list) {
    setSelected(list);
    setModal('delete');
  }

  function closeModal() {
    setModal(null); setSelected(null);
    setPickedMovies([]); setMovieQuery(''); setMovieResults([]);
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    const { data: { session } } = await supabase.auth.getSession();

    const { data: newList, error: err } = await supabase
      .from('lists')
      .insert({ user_id: session.user.id, title: title.trim(), description: desc.trim() || null })
      .select('id')
      .single();

    if (err) { setError(err.message); setSaving(false); return; }

    if (pickedMovies.length > 0) {
      await supabase.from('list_items').insert(
        pickedMovies.map((m, i) => ({ list_id: newList.id, movie_id: m.id, position: i + 1 }))
      );
    }

    setSaving(false);
    closeModal();
    fetchLists();
  }

  async function handleEdit() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');

    const { error: err } = await supabase
      .from('lists')
      .update({ title: title.trim(), description: desc.trim() || null })
      .eq('id', selected.id);

    if (err) { setError(err.message); setSaving(false); return; }

    await supabase.from('list_items').delete().eq('list_id', selected.id);
    if (pickedMovies.length > 0) {
      await supabase.from('list_items').insert(
        pickedMovies.map((m, i) => ({ list_id: selected.id, movie_id: m.id, position: i + 1 }))
      );
    }

    setSaving(false);
    closeModal();
    fetchLists();
  }

  async function handleDelete() {
    setSaving(true);
    await supabase.from('list_items').delete().eq('list_id', selected.id);
    await supabase.from('lists').delete().eq('id', selected.id);
    setSaving(false);
    closeModal();
    fetchLists();
  }

  const showingModal = modal === 'create' || modal === 'edit';

  return (
    <div className={styles.wrapper}>

      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>Lists</h3>
        <button className={styles.newBtn} onClick={openCreate}>+ New List</button>
      </div>

      {lists.length === 0 ? (
        <p className={styles.empty}>No lists yet.</p>
      ) : (
        <div className={styles.stack}>
          {lists.map((list) => (
            <div key={list.id} className={styles.listRow}>

              {/* list header */}
              <div className={styles.listHeader}>
                <div className={styles.listMeta}>
                  <Link href={`/lists/${list.id}`} className={styles.listTitle}>{list.title}</Link>
                  <span className={styles.listCount}>{list.films.length} film{list.films.length !== 1 ? 's' : ''}</span>
                  {list.description && <p className={styles.listDesc}>{list.description}</p>}
                </div>
                <div className={styles.listActions}>
                  <button className={styles.editBtn} onClick={() => openEdit(list)}>Edit</button>
                  <button className={styles.deleteBtn} onClick={() => openDelete(list)}>Delete</button>
                </div>
              </div>

              {/* horizontal film shelf */}
              {list.films.length > 0 ? (
                <div className={styles.shelf}>
                  {list.films.map((movie) => (
                    <PosterCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <p className={styles.shelfEmpty}>No films added yet.</p>
              )}

            </div>
          ))}
        </div>
      )}

      {/* create / edit modal */}
      {showingModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            <h2 className={styles.modalTitle}>{modal === 'create' ? 'New List' : 'Edit List'}</h2>

            <label className={styles.fieldLabel}>Title</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="List title"
            />

            <label className={styles.fieldLabel}>
              Description <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this list about?"
              rows={2}
            />

            <label className={styles.fieldLabel}>
              Films <span className={styles.optional}>(optional)</span>
            </label>

            {pickedMovies.length > 0 && (
              <div className={styles.pickedList}>
                {pickedMovies.map((m) => (
                  <div key={m.id} className={styles.pickedItem}>
                    {m.poster_url
                      ? <img src={m.poster_url} className={styles.pickedPoster} alt={m.title} />
                      : <div className={styles.pickedPosterFallback}>🎬</div>
                    }
                    <span className={styles.pickedTitle}>{m.title}</span>
                    <span className={styles.pickedYear}>{m.release_year}</span>
                    <button className={styles.pickedRemove} onClick={() => removeMovie(m.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.searchWrap} ref={searchRef}>
              <input
                className={styles.input}
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                placeholder="Search for a film..."
              />
              {movieResults.length > 0 && (
                <div className={styles.searchDrop}>
                  {movieResults.map((m) => (
                    <div
                      key={m.id}
                      className={`${styles.searchResult} ${pickedMovies.find((p) => p.id === m.id) ? styles.searchResultPicked : ''}`}
                      onClick={() => addMovie(m)}
                    >
                      {m.poster_url
                        ? <img src={m.poster_url} className={styles.resultPoster} alt={m.title} />
                        : <div className={styles.resultPosterFallback}>🎬</div>
                      }
                      <span className={styles.resultTitle}>{m.title}</span>
                      <span className={styles.resultYear}>{m.release_year}</span>
                      {pickedMovies.find((p) => p.id === m.id) && <span className={styles.addedBadge}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className={styles.formError}>{error}</p>}

            <button
              className={styles.submitBtn}
              onClick={modal === 'create' ? handleCreate : handleEdit}
              disabled={saving}
            >
              {saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* delete modal */}
      {modal === 'delete' && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            <h2 className={styles.modalTitle}>Delete List</h2>
            <p className={styles.confirmText}>
              Delete <strong>{selected?.title}</strong>? This will also remove all movies in this list.
            </p>
            <div className={styles.confirmRow}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.dangerBtn} onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
