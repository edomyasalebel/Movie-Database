// One-time script to fetch correct TMDB poster paths
// Run with: node scripts/fetch-posters.mjs YOUR_API_KEY

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: node scripts/fetch-posters.mjs YOUR_API_KEY');
  process.exit(1);
}

const movies = [
  { title: 'Dune: Part Two',                    year: 2024 },
  { title: 'Severance',                          year: 2022 },
  { title: 'Jujutsu Kaisen',                     year: 2020 },
  { title: 'Sinners',                            year: 2025 },
  { title: 'A Real Pain',                        year: 2024 },
  { title: 'Mickey 17',                          year: 2025 },
  { title: 'Conclave',                           year: 2024 },
  { title: 'The Brutalist',                      year: 2024 },
  { title: 'Parasite',                           year: 2019 },
  { title: 'Eternal Sunshine of the Spotless Mind', year: 2004 },
  { title: 'Interstellar',                       year: 2014 },
  { title: 'No Country for Old Men',             year: 2007 },
  { title: 'Yi Yi',                              year: 2000 },
  { title: 'In the Mood for Love',               year: 2000 },
  { title: 'Shoplifters',                        year: 2018 },
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
