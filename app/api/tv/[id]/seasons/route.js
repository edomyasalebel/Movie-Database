// Returns episode counts per season for a TMDB TV show.
// Used by the TV detail page to cap the episode input when tracking progress.
import { NextResponse } from 'next/server';

const TMDB_KEY = process.env.TMDB_API_KEY;

export async function GET(request, { params }) {
  const { id } = await params;

  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&append_to_response=seasons`
  );
  if (!res.ok) return NextResponse.json({ error: 'TMDB failed' }, { status: 502 });

  const data = await res.json();

  // build a map: seasonNumber → episodeCount, skipping specials (season 0)
  const seasonMap = {};
  for (const s of data.seasons || []) {
    if (s.season_number > 0) {
      seasonMap[s.season_number] = s.episode_count;
    }
  }

  return NextResponse.json({ seasons: seasonMap });
}
