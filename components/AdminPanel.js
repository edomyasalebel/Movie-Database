'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import styles from './AdminPanel.module.css';

const EMPTY_MOVIE = {
  title: '', type: 'movie', release_year: '', duration_min: '',
  lang: '', country: '', poster_url: '', backdrop_url: '',
  description: '', average_rating: '',
};

const EMPTY_PERSON = {
  name: '', gender: '', birth_date: '', death_date: '',
  photo_url: '', description: '',
};

const ROLES = ['director', 'actor', 'writer', 'producer'];

// ── Add Movie Tab ──────────────────────────────────────────────
function AddMovieTab() {
  const [form, setForm]             = useState(EMPTY_MOVIE);
  const [genres, setGenres]         = useState([]);
  const [pickedGenres, setPickedGenres] = useState([]);
  const [credits, setCredits]       = useState([]); // [{person, role, character}]
  const [peopleQuery, setPeopleQuery]   = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [pendingRole, setPendingRole]     = useState('actor');
  const [pendingChar, setPendingChar]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    supabase.from('genres').select('id, name').order('name')
      .then(({ data }) => { if (data) setGenres(data); });
  }, []);

  // debounced people search
  useEffect(() => {
    if (!peopleQuery.trim()) { setPeopleResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('people')
        .select('id, name, photo_url')
        .ilike('name', `%${peopleQuery}%`)
        .limit(6);
      setPeopleResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [peopleQuery]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function toggleGenre(id) {
    setPickedGenres((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);
  }

  function addCredit(person) {
    if (credits.find((c) => c.person.id === person.id && c.role === pendingRole)) return;
    setCredits((p) => [...p, { person, role: pendingRole, character: pendingChar.trim() }]);
    setPeopleQuery(''); setPeopleResults([]); setPendingChar('');
  }

  function removeCredit(idx) { setCredits((p) => p.filter((_, i) => i !== idx)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError(''); setSuccess('');

    const { data: movie, error: movieErr } = await supabase.from('movies')
      .insert({
        title: form.title.trim(), type: form.type,
        release_year:   form.release_year   ? Number(form.release_year)   : null,
        duration_min:   form.duration_min   ? Number(form.duration_min)   : null,
        lang:           form.lang.trim()    || null,
        country:        form.country.trim() || null,
        poster_url:     form.poster_url.trim()   || null,
        backdrop_url:   form.backdrop_url.trim() || null,
        description:    form.description.trim()  || null,
        average_rating: form.average_rating ? Number(form.average_rating) : null,
      })
      .select('id').single();

    if (movieErr) { setError(movieErr.message); setSaving(false); return; }

    if (pickedGenres.length > 0)
      await supabase.from('movie_genres').insert(pickedGenres.map((genre_id) => ({ movie_id: movie.id, genre_id })));

    if (credits.length > 0)
      await supabase.from('credits').insert(credits.map((c) => ({
        movie_id: movie.id, person_id: c.person.id,
        role_type: c.role, character_name: c.character || null,
      })));

    setSaving(false);
    setSuccess(`"${form.title}" added! (ID: ${movie.id})`);
    setForm(EMPTY_MOVIE); setPickedGenres([]); setCredits([]);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* title + type */}
      <div className={styles.row}>
        <div className={styles.fieldLg}>
          <label className={styles.label}>Title <span className={styles.req}>*</span></label>
          <input className={styles.input} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Parasite" />
        </div>
        <div className={styles.fieldSm}>
          <label className={styles.label}>Type <span className={styles.req}>*</span></label>
          <select className={styles.select} value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
          </select>
        </div>
      </div>

      {/* year + duration + lang + country */}
      <div className={styles.row}>
        <div className={styles.field}><label className={styles.label}>Release Year</label><input className={styles.input} type="number" value={form.release_year} onChange={(e) => set('release_year', e.target.value)} placeholder="2024" /></div>
        <div className={styles.field}><label className={styles.label}>Duration (min)</label><input className={styles.input} type="number" value={form.duration_min} onChange={(e) => set('duration_min', e.target.value)} placeholder="132" /></div>
        <div className={styles.field}><label className={styles.label}>Language</label><input className={styles.input} value={form.lang} onChange={(e) => set('lang', e.target.value)} placeholder="Korean" /></div>
        <div className={styles.field}><label className={styles.label}>Country</label><input className={styles.input} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="South Korea" /></div>
      </div>

      {/* poster + backdrop */}
      <div className={styles.row}>
        <div className={styles.fieldLg}><label className={styles.label}>Poster URL</label><input className={styles.input} value={form.poster_url} onChange={(e) => set('poster_url', e.target.value)} placeholder="https://..." /></div>
        <div className={styles.fieldLg}><label className={styles.label}>Backdrop URL</label><input className={styles.input} value={form.backdrop_url} onChange={(e) => set('backdrop_url', e.target.value)} placeholder="https://..." /></div>
      </div>

      {form.poster_url && (
        <div className={styles.previewRow}>
          <img src={form.poster_url} alt="poster" className={styles.posterPreview} />
          {form.backdrop_url && <img src={form.backdrop_url} alt="backdrop" className={styles.backdropPreview} />}
        </div>
      )}

      {/* description */}
      <div className={styles.fieldFull}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short synopsis..." rows={3} />
      </div>

      {/* rating */}
      <div className={styles.field}>
        <label className={styles.label}>Average Rating <span className={styles.opt}>(0.5–5)</span></label>
        <input className={styles.input} type="number" value={form.average_rating} onChange={(e) => set('average_rating', e.target.value)} placeholder="4.5" min="0.5" max="5" step="0.1" />
      </div>

      {/* genres */}
      <div className={styles.fieldFull}>
        <label className={styles.label}>Genres</label>
        <div className={styles.chipGrid}>
          {genres.map((g) => (
            <button key={g.id} type="button"
              className={`${styles.chip} ${pickedGenres.includes(g.id) ? styles.chipActive : ''}`}
              onClick={() => toggleGenre(g.id)}>{g.name}</button>
          ))}
        </div>
      </div>

      {/* ── cast & crew ── */}
      <div className={styles.fieldFull}>
        <label className={styles.label}>Cast &amp; Crew</label>

        {/* added credits list */}
        {credits.length > 0 && (
          <div className={styles.creditList}>
            {credits.map((c, i) => (
              <div key={i} className={styles.creditItem}>
                {c.person.photo_url
                  ? <img src={c.person.photo_url} className={styles.creditPhoto} alt={c.person.name} />
                  : <div className={styles.creditPhotoFallback}>👤</div>}
                <div className={styles.creditInfo}>
                  <span className={styles.creditName}>{c.person.name}</span>
                  <span className={styles.creditRole}>{c.role}{c.character ? ` · ${c.character}` : ''}</span>
                </div>
                <button type="button" className={styles.creditRemove} onClick={() => removeCredit(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* role + character inputs */}
        <div className={styles.row} style={{ marginBottom: 8 }}>
          <div className={styles.fieldSm}>
            <label className={styles.label}>Role</label>
            <select className={styles.select} value={pendingRole} onChange={(e) => setPendingRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {pendingRole === 'actor' && (
            <div className={styles.fieldLg}>
              <label className={styles.label}>Character name <span className={styles.opt}>(optional)</span></label>
              <input className={styles.input} value={pendingChar} onChange={(e) => setPendingChar(e.target.value)} placeholder="e.g. Tony Stark" />
            </div>
          )}
        </div>

        {/* people search */}
        <div className={styles.searchWrap} ref={searchRef}>
          <input className={styles.input} value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} placeholder="Search people to add..." />
          {peopleResults.length > 0 && (
            <div className={styles.searchDrop}>
              {peopleResults.map((p) => (
                <div key={p.id} className={styles.searchResult} onClick={() => addCredit(p)}>
                  {p.photo_url
                    ? <img src={p.photo_url} className={styles.dropPhoto} alt={p.name} />
                    : <div className={styles.dropPhotoFallback}>👤</div>}
                  <span className={styles.dropName}>{p.name}</span>
                  <span className={styles.dropAdd}>+ Add as {pendingRole}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error   && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <button type="submit" className={styles.submitBtn} disabled={saving}>
        {saving ? 'Adding...' : '+ Add Movie'}
      </button>
    </form>
  );
}

// ── Add Person Tab ─────────────────────────────────────────────
function AddPersonTab() {
  const [form, setForm]   = useState(EMPTY_PERSON);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError(''); setSuccess('');

    const { data: person, error: err } = await supabase.from('people')
      .insert({
        name:        form.name.trim(),
        gender:      form.gender.trim()      || null,
        birth_date:  form.birth_date         || null,
        death_date:  form.death_date         || null,
        photo_url:   form.photo_url.trim()   || null,
        description: form.description.trim() || null,
      })
      .select('id').single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(`"${form.name}" added! (ID: ${person.id})`);
    setForm(EMPTY_PERSON);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      <div className={styles.row}>
        <div className={styles.fieldLg}>
          <label className={styles.label}>Name <span className={styles.req}>*</span></label>
          <input className={styles.input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bong Joon-ho" />
        </div>
        <div className={styles.fieldSm}>
          <label className={styles.label}>Gender</label>
          <select className={styles.select} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Birth Date</label>
          <input className={styles.input} type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Death Date <span className={styles.opt}>(if applicable)</span></label>
          <input className={styles.input} type="date" value={form.death_date} onChange={(e) => set('death_date', e.target.value)} />
        </div>
      </div>

      <div className={styles.fieldFull}>
        <label className={styles.label}>Photo URL</label>
        <input className={styles.input} value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://..." />
      </div>

      {form.photo_url && (
        <img src={form.photo_url} alt="preview" className={styles.personPhotoPreview} />
      )}

      <div className={styles.fieldFull}>
        <label className={styles.label}>Bio <span className={styles.opt}>(optional)</span></label>
        <textarea className={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short biography..." rows={3} />
      </div>

      {error   && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <button type="submit" className={styles.submitBtn} disabled={saving}>
        {saving ? 'Adding...' : '+ Add Person'}
      </button>
    </form>
  );
}

// ── Manage Movies Tab (edit + delete) ─────────────────────────
function ManageMoviesTab() {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [selected, setSelected]     = useState(null); // movie being edited
  const [form, setForm]             = useState(null);
  const [genres, setGenres]         = useState([]);
  const [pickedGenres, setPickedGenres] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  // load all genres once for the genre picker
  useEffect(() => {
    supabase.from('genres').select('id, name').order('name')
      .then(({ data }) => { if (data) setGenres(data); });
  }, []);

  // debounced movie search by title
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('movies')
        .select('id, title, release_year, type, poster_url')
        .ilike('title', `%${query}%`)
        .order('release_year', { ascending: false })
        .limit(8);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // load a movie into the edit form, including its current genres
  async function selectMovie(movie) {
    const { data: fullMovie } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movie.id)
      .single();

    const { data: movieGenres } = await supabase
      .from('movie_genres')
      .select('genre_id')
      .eq('movie_id', movie.id);

    setSelected(fullMovie);
    setForm({
      title:          fullMovie.title         ?? '',
      type:           fullMovie.type          ?? 'movie',
      release_year:   fullMovie.release_year  ?? '',
      duration_min:   fullMovie.duration_min  ?? '',
      lang:           fullMovie.lang          ?? '',
      country:        fullMovie.country       ?? '',
      poster_url:     fullMovie.poster_url    ?? '',
      backdrop_url:   fullMovie.backdrop_url  ?? '',
      description:    fullMovie.description   ?? '',
      average_rating: fullMovie.average_rating ?? '',
    });
    // pre-check the genres this movie already has
    setPickedGenres((movieGenres || []).map((g) => g.genre_id));
    setSuccess(''); setError(''); setConfirmDelete(false);
    setResults([]); setQuery('');
  }

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function toggleGenre(id) {
    setPickedGenres((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);
  }

  // save edits — update movies row + replace genre associations
  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');

    const { error: updateError } = await supabase.from('movies').update({
      title:          form.title.trim(),
      type:           form.type,
      release_year:   form.release_year   ? Number(form.release_year)   : null,
      duration_min:   form.duration_min   ? Number(form.duration_min)   : null,
      lang:           form.lang.trim()    || null,
      country:        form.country.trim() || null,
      poster_url:     form.poster_url.trim()    || null,
      backdrop_url:   form.backdrop_url.trim()  || null,
      description:    form.description.trim()   || null,
      average_rating: form.average_rating ? Number(form.average_rating) : null,
    }).eq('id', selected.id);

    if (updateError) { setError(updateError.message); setSaving(false); return; }

    // replace genre associations: delete old ones then insert new selection
    await supabase.from('movie_genres').delete().eq('movie_id', selected.id);
    if (pickedGenres.length > 0)
      await supabase.from('movie_genres').insert(pickedGenres.map((genre_id) => ({ movie_id: selected.id, genre_id })));

    setSaving(false);
    setSuccess(`"${form.title}" updated.`);
  }

  // delete movie — cascades to movie_genres, credits, reviews, diary, watchlist via FK
  async function handleDelete() {
    setDeleting(true);
    const { error: deleteError } = await supabase.from('movies').delete().eq('id', selected.id);
    if (deleteError) { setError(deleteError.message); setDeleting(false); return; }
    // reset state after successful delete
    setSelected(null); setForm(null); setConfirmDelete(false);
    setSuccess(`Movie deleted.`);
  }

  return (
    <div className={styles.manageWrap}>

      {/* search box */}
      <div className={styles.searchWrap}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies by title..."
        />
        {results.length > 0 && (
          <div className={styles.searchDrop}>
            {results.map((m) => (
              <div key={m.id} className={styles.searchResult} onClick={() => selectMovie(m)}>
                {m.poster_url
                  ? <img src={m.poster_url} className={styles.dropPhoto} alt={m.title} />
                  : <div className={styles.dropPhotoFallback}>🎬</div>}
                <span className={styles.dropName}>{m.title}</span>
                <span className={styles.creditRole}>{m.release_year} · {m.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* edit form — shown once a movie is selected */}
      {selected && form && (
        <div className={styles.editSection}>
          <h3 className={styles.editHeading}>Editing: {selected.title}</h3>

          <div className={styles.row}>
            <div className={styles.fieldLg}>
              <label className={styles.label}>Title</label>
              <input className={styles.input} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className={styles.fieldSm}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="movie">Movie</option>
                <option value="tv">TV</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}><label className={styles.label}>Release Year</label><input className={styles.input} type="number" value={form.release_year} onChange={(e) => set('release_year', e.target.value)} /></div>
            <div className={styles.field}><label className={styles.label}>Duration (min)</label><input className={styles.input} type="number" value={form.duration_min} onChange={(e) => set('duration_min', e.target.value)} /></div>
            <div className={styles.field}><label className={styles.label}>Language</label><input className={styles.input} value={form.lang} onChange={(e) => set('lang', e.target.value)} /></div>
            <div className={styles.field}><label className={styles.label}>Country</label><input className={styles.input} value={form.country} onChange={(e) => set('country', e.target.value)} /></div>
          </div>

          <div className={styles.row}>
            <div className={styles.fieldLg}><label className={styles.label}>Poster URL</label><input className={styles.input} value={form.poster_url} onChange={(e) => set('poster_url', e.target.value)} /></div>
            <div className={styles.fieldLg}><label className={styles.label}>Backdrop URL</label><input className={styles.input} value={form.backdrop_url} onChange={(e) => set('backdrop_url', e.target.value)} /></div>
          </div>

          {form.poster_url && (
            <div className={styles.previewRow}>
              <img src={form.poster_url} alt="poster" className={styles.posterPreview} />
              {form.backdrop_url && <img src={form.backdrop_url} alt="backdrop" className={styles.backdropPreview} />}
            </div>
          )}

          <div className={styles.fieldFull}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Average Rating</label>
            <input className={styles.input} type="number" value={form.average_rating} onChange={(e) => set('average_rating', e.target.value)} min="0.5" max="5" step="0.1" />
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.label}>Genres</label>
            <div className={styles.chipGrid}>
              {genres.map((g) => (
                <button key={g.id} type="button"
                  className={`${styles.chip} ${pickedGenres.includes(g.id) ? styles.chipActive : ''}`}
                  onClick={() => toggleGenre(g.id)}>{g.name}</button>
              ))}
            </div>
          </div>

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.manageActions}>
            <button className={styles.submitBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            {/* delete with confirmation step */}
            {!confirmDelete
              ? <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Delete Movie</button>
              : (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>Are you sure? This cannot be undone.</span>
                  <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPanel ────────────────────────────────────────────
const ADMIN_TABS = ['Add Movie', 'Manage Movies', 'People'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Add Movie');

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.badge}>ADMIN</span>
        <h2 className={styles.title}>Dashboard</h2>
      </div>

      <div className={styles.adminTabs}>
        {ADMIN_TABS.map((t) => (
          <button key={t}
            className={`${styles.adminTab} ${tab === t ? styles.adminTabActive : ''}`}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Add Movie'     && <AddMovieTab />}
      {tab === 'Manage Movies' && <ManageMoviesTab />}
      {tab === 'People'        && <AddPersonTab />}
    </div>
  );
}
