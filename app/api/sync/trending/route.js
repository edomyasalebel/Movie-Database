import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildGenreMap, syncMovieFromTmdb } from '../../../../lib/tmdb-sync';

const TMDB_KEY = process.env.TMDB_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  // fetch this week's trending from TMDB
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`
  );
  if (!res.ok) return NextResponse.json({ error: 'TMDB failed' }, { status: 502 });

  const json     = await res.json();
  const results  = json.results || [];

  // build genre map once for all movies in this sync
  const { genreNameToId } = await buildGenreMap(supabase);

  // fully sync each trending movie into our DB and collect their DB ids + rank
  const trendingRows = [];
  for (let i = 0; i < results.length; i++) {
    const movie = await syncMovieFromTmdb(supabase, results[i].id, genreNameToId);
    if (movie) trendingRows.push({ movie_id: movie.id, rank: i + 1 });
  }

  // replace the entire trending table with this week's results
  await supabase.from('trending').delete().neq('rank', -1); // delete all rows
  if (trendingRows.length > 0) {
    await supabase.from('trending').insert(trendingRows);
  }

  return NextResponse.json({ synced: trendingRows.length });
}
