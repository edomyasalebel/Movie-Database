// Syncs this week's trending TV shows from TMDB into our movies table (type='tv').
// Same pattern as /api/sync/trending but hits the TV endpoint.
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
    `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}`
  );
  if (!res.ok) return NextResponse.json({ error: 'TMDB failed' }, { status: 502 });

  const json    = await res.json();
  const results = json.results || [];

  const { genreNameToId } = await buildTvGenreMap(supabase);

  let synced = 0;
  const trendingRows = [];
  for (let i = 0; i < results.length; i++) {
    const result = await syncTvFromTmdb(supabase, results[i].id, genreNameToId);
    if (result) {
      trendingRows.push({ movie_id: result.id, rank: i + 1 });
      synced++;
    }
  }

  // replace trending_tv table with this week's results from TMDB
  await supabase.from('trending_tv').delete().neq('rank', -1);
  if (trendingRows.length > 0) await supabase.from('trending_tv').insert(trendingRows);

  return NextResponse.json({ synced });
}
