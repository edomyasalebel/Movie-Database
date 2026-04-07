// One-time script to fetch correct TMDB poster paths
// Run with: node scripts/fetch-posters.mjs YOUR_API_KEY

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: node scripts/fetch-posters.mjs YOUR_API_KEY');
  process.exit(1);
}

// only the movies that currently have null poster_url in the DB
const movies = [
  { title: 'Oldboy',                year: 2003 },
  { title: 'The Handmaiden',        year: 2016 },
  { title: 'Burning',               year: 2018 },
  { title: 'Chungking Express',     year: 1994 },
  { title: 'Spirited Away',         year: 2002 },
  { title: 'Memories of Murder',    year: 2003 },
  { title: 'Drive My Car',          year: 2021 },
  { title: 'Raise the Red Lantern', year: 1991 },
];

const BASE_IMG = 'https://image.tmdb.org/t/p/w342';

async function searchMovie(title, year) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=en-US`;
  const res = await fetch(url);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;
  return {
    title,
    year,
    poster_path: result.poster_path,
    full_url: result.poster_path ? `${BASE_IMG}${result.poster_path}` : null,
  };
}

console.log('\nFetching poster paths from TMDB...\n');

for (const movie of movies) {
  const result = await searchMovie(movie.title, movie.year);
  if (result?.poster_path) {
    console.log(`✅ ${movie.title} (${movie.year})`);
    console.log(`   poster_url: '${result.full_url}'`);
  } else {
    console.log(`❌ ${movie.title} (${movie.year}) — not found`);
  }
  console.log('');
}
