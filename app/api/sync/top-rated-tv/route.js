// Syncs TMDB's all-time top rated TV shows into our movies table (type='tv').
// Same pattern as /api/sync/top-rated but hits the TV endpoint.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildTvGenreMap, syncTvFromTmdb } from '../../../../lib/tmdb-sync';

const TMDB_KEY = process.env.TMDB_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  const res = await fetch(
    `https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_KEY}`
  );
  if (!res.ok) return NextResponse.json({ error: 'TMDB failed' }, { status: 502 });

  const json    = await res.json();
  const results = json.results || [];

  const { genreNameToId } = await buildTvGenreMap(supabase);

  let synced = 0;
  for (const show of results.slice(0, 12)) {
    const result = await syncTvFromTmdb(supabase, show.id, genreNameToId);
    if (result) synced++;
  }

  return NextResponse.json({ synced });
}
