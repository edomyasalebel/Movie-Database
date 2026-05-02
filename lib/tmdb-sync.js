/**
 * tmdb-sync.js
 *
 * Shared server-side utility for fully syncing a TMDB movie into our Supabase DB.
 * Used by API routes (trending, similar) so every movie shown on the site
 * is a complete DB record with genres and credits — not a partial upsert.
 *
 * Mirrors the logic in scripts/seed-tmdb.mjs but designed for runtime use.
 */

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p';

// ── TMDB fetch helper ───────────────────────────────────────────
async function tmdbFetch(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json();
}

const posterUrl   = (path) => path ? `${IMG_BASE}/w500${path}`    : null;
const backdropUrl = (path) => path ? `${IMG_BASE}/original${path}` : null;

// ── genre map ───────────────────────────────────────────────────
// Fetches our DB genres and TMDB genre list, returns two maps:
//   genreNameToId: genre name → our DB genre id  (for inserting movie_genres)
//   tmdbIdToName:  tmdb genre id → genre name     (for filtering by genre id)
export async function buildGenreMap(supabase) {
  // fetch TMDB genre list and upsert any new genres into our DB
  const { genres: tmdbGenres } = await tmdbFetch('/genre/movie/list');
  for (const g of tmdbGenres) {
    await supabase.from('genres').upsert({ id: g.id, name: g.name }, { onConflict: 'name' });
  }

  // fetch all genres from our DB to build the name → id map
  const { data: dbGenres } = await supabase.from('genres').select('id, name');

  const genreNameToId = {};
  (dbGenres || []).forEach((g) => { genreNameToId[g.name] = g.id; });

  // tmdb id → name map (used for filtering in similar route)
  const tmdbIdToName = {};
  tmdbGenres.forEach((g) => { tmdbIdToName[g.id] = g.name; });

  return { genreNameToId, tmdbIdToName };
}

// ── upsert person ───────────────────────────────────────────────
// Inserts a person if they don't exist yet, returns our DB person id.
// Deduplicates by name — same approach as the seed script.
async function upsertPerson(supabase, p) {
  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .eq('name', p.name)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase.from('people').insert({
    name:      p.name,
    gender:    p.gender === 1 ? 'female' : p.gender === 2 ? 'male' : null,
    photo_url: posterUrl(p.profile_path),
  }).select('id').single();

  if (error) return null;
  return data.id;
}

// ── full movie sync ─────────────────────────────────────────────
// Given a TMDB movie id, fetches full details + credits from TMDB,
// upserts the movie row, genre links, people, and credits into our DB.
// Returns the complete DB movie record, or null on failure.
//
// This is the single source of truth for adding movies to our DB at runtime.
// Both the trending and similar API routes use this so every movie on the
// site is a fully populated DB record.
export async function syncMovieFromTmdb(supabase, tmdbId, genreNameToId) {
  // fetch movie details and credits in parallel to save time
  const [detail, creditsData] = await Promise.all([
    tmdbFetch(`/movie/${tmdbId}`),
    tmdbFetch(`/movie/${tmdbId}/credits`),
  ]);

  // upsert the movie row — onConflict: tmdb_id means existing movies get updated
  const { data: movie, error: movieErr } = await supabase.from('movies').upsert({
    tmdb_id:        tmdbId,
    title:          detail.title,
    type:           'movie',
    release_year:   detail.release_date ? Number(detail.release_date.slice(0, 4)) : null,
    duration_min:   detail.runtime      || null,
    lang:           detail.original_language || null,
    country:        detail.production_countries?.[0]?.name || null,
    poster_url:     posterUrl(detail.poster_path),
    backdrop_url:   backdropUrl(detail.backdrop_path),
    description:    detail.overview     || null,
    average_rating:    detail.vote_average ? Math.round((detail.vote_average / 10) * 5 * 100) / 100 : null,
    tmdb_vote_average: detail.vote_average || null,
    tmdb_vote_count:   detail.vote_count   || null,
  }, { onConflict: 'tmdb_id' })
    .select('id, title, release_year, poster_url, backdrop_url, average_rating')
    .single();

  if (movieErr || !movie) return null;

  // ── genres ──
  // Map TMDB genre names to our DB genre ids and insert movie_genres links.
  // Ignore genres we don't have in our DB yet (shouldn't happen after buildGenreMap).
  const genreIds = (detail.genres || [])
    .map((g) => genreNameToId[g.name])
    .filter(Boolean);

  if (genreIds.length > 0) {
    // delete existing genre links first to avoid duplicates on re-sync
    await supabase.from('movie_genres').delete().eq('movie_id', movie.id);
    await supabase.from('movie_genres').insert(
      genreIds.map((genre_id) => ({ movie_id: movie.id, genre_id }))
    );
  }

  // ── credits ──
  // Top 2 directors, writers, producers + top 10 actors.
  // Same limits as the seed script for consistency.
  const crew  = creditsData.crew || [];
  const cast  = creditsData.cast || [];

  const creditRows = [
    ...crew.filter((c) => c.job === 'Director')
           .slice(0, 2)
           .map((p) => ({ person: p, role: 'director', character: null })),
    ...crew.filter((c) => ['Screenplay', 'Writer', 'Story'].includes(c.job))
           .slice(0, 2)
           .map((p) => ({ person: p, role: 'writer', character: null })),
    ...crew.filter((c) => c.job === 'Producer')
           .slice(0, 2)
           .map((p) => ({ person: p, role: 'producer', character: null })),
    ...cast.slice(0, 10)
           .map((p) => ({ person: p, role: 'actor', character: p.character || null })),
  ];

  // delete existing credits before re-inserting to avoid duplicates on re-sync
  await supabase.from('credits').delete().eq('movie_id', movie.id);

  for (const row of creditRows) {
    const personId = await upsertPerson(supabase, row.person);
    if (!personId) continue;

    await supabase.from('credits').insert({
      movie_id:       movie.id,
      person_id:      personId,
      role_type:      row.role,
      character_name: row.character,
    });
  }

  return movie;
}

// ── full TV show sync ───────────────────────────────────────────
// Same pattern as syncMovieFromTmdb but hits TMDB's TV endpoints.
// Maps TMDB TV fields (name, first_air_date, number_of_seasons etc.)
// to our movies table columns. type is always 'tv'.
export async function syncTvFromTmdb(supabase, tmdbId, genreNameToId) {
  const [detail, creditsData] = await Promise.all([
    tmdbFetch(`/tv/${tmdbId}`),
    tmdbFetch(`/tv/${tmdbId}/credits`),
  ]);

  const { data: show, error: showErr } = await supabase.from('movies').upsert({
    tmdb_id:        tmdbId,
    title:          detail.name,                          // TV uses 'name' not 'title'
    type:           'tv',
    release_year:   detail.first_air_date ? Number(detail.first_air_date.slice(0, 4)) : null,
    duration_min:   detail.episode_run_time?.[0] || null, // avg episode length
    lang:           detail.original_language || null,
    country:        detail.origin_country?.[0] || null,
    poster_url:     posterUrl(detail.poster_path),
    backdrop_url:   backdropUrl(detail.backdrop_path),
    description:    detail.overview || null,
    average_rating: detail.vote_average ? Math.round((detail.vote_average / 10) * 5 * 100) / 100 : null,
    tmdb_vote_average: detail.vote_average || null,
    tmdb_vote_count:   detail.vote_count   || null,
    seasons_count:   detail.number_of_seasons   || null,
    episodes_count:  detail.number_of_episodes  || null,
  }, { onConflict: 'tmdb_id,type' })
    .select('id, title, release_year, poster_url, backdrop_url, average_rating')
    .single();

  if (showErr || !show) { console.error('TV upsert failed:', showErr?.message); return null; }

  // genres — TV genre ids from TMDB map to same genre names as movies
  const genreIds = (detail.genres || [])
    .map((g) => genreNameToId[g.name])
    .filter(Boolean);

  if (genreIds.length > 0) {
    await supabase.from('movie_genres').delete().eq('movie_id', show.id);
    await supabase.from('movie_genres').insert(
      genreIds.map((genre_id) => ({ movie_id: show.id, genre_id }))
    );
  }

  // credits — TV credits endpoint returns same structure as movies
  const crew = creditsData.crew || [];
  const cast = creditsData.cast || [];

  const creditRows = [
    ...crew.filter((c) => c.job === 'Director').slice(0, 2).map((p) => ({ person: p, role: 'director', character: null })),
    ...crew.filter((c) => ['Screenplay', 'Writer', 'Story'].includes(c.job)).slice(0, 2).map((p) => ({ person: p, role: 'writer', character: null })),
    ...crew.filter((c) => c.job === 'Producer').slice(0, 2).map((p) => ({ person: p, role: 'producer', character: null })),
    ...cast.slice(0, 10).map((p) => ({ person: p, role: 'actor', character: p.character || null })),
  ];

  await supabase.from('credits').delete().eq('movie_id', show.id);
  for (const row of creditRows) {
    const personId = await upsertPerson(supabase, row.person);
    if (!personId) continue;
    await supabase.from('credits').insert({
      movie_id: show.id, person_id: personId,
      role_type: row.role, character_name: row.character,
    });
  }

  return show;
}

// ── TV genre map ────────────────────────────────────────────────
// Fetches TMDB TV genres and merges them into our genres table.
// TV and movie genres overlap heavily (Drama, Comedy etc.) so we upsert by name.
export async function buildTvGenreMap(supabase) {
  const { genres: tmdbGenres } = await tmdbFetch('/genre/tv/list');
  for (const g of tmdbGenres) {
    await supabase.from('genres').upsert({ name: g.name }, { onConflict: 'name' });
  }
  const { data: dbGenres } = await supabase.from('genres').select('id, name');
  const genreNameToId = {};
  (dbGenres || []).forEach((g) => { genreNameToId[g.name] = g.id; });
  return { genreNameToId };
}
