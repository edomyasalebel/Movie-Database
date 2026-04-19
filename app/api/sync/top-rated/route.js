import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildGenreMap, syncMovieFromTmdb } from '../../../../lib/tmdb-sync';

const TMDB_KEY = process.env.TMDB_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  // fetch TMDB's all-time top rated list
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}`
  );
  if (!res.ok) return NextResponse.json({ error: 'TMDB failed' }, { status: 502 });

  const json    = await res.json();
  const results = json.results || [];

  const { genreNameToId } = await buildGenreMap(supabase);

  // fully sync each top rated movie into our DB
  const rows = [];
  for (let i = 0; i < results.length; i++) {
    const movie = await syncMovieFromTmdb(supabase, results[i].id, genreNameToId);
    if (movie) rows.push({ movie_id: movie.id, rank: i + 1 });
  }

  // replace the entire top_rated table with the latest results
  await supabase.from('top_rated').delete().neq('rank', -1);
  if (rows.length > 0) await supabase.from('top_rated').insert(rows);

  return NextResponse.json({ synced: rows.length });
}
