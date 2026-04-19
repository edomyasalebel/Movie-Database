import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request, { params }) {
  const { id } = await params;

  const { data } = await supabase
    .from('movie_similar')
    .select('rank, movies!movie_similar_similar_movie_id_fkey(id, title, release_year, poster_url, average_rating)')
    .eq('movie_id', Number(id))
    .order('rank');

  const movies = (data || []).map((r) => r.movies).filter(Boolean);
  return NextResponse.json(movies);
}
