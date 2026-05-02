'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import PosterCard from '../../../components/PosterCard';
import styles from './page.module.css';

const ROLE_LABELS = {
  actor:    'Acting',
  director: 'Directing',
  writer:   'Writing',
  producer: 'Producing',
};

const ROLE_ORDER = ['actor', 'director', 'writer', 'producer'];

export default function PersonPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [person, setPerson]   = useState(null);
  const [credits, setCredits] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, gender, photo_url, credits(role_type, character_name, movies(id, title, release_year, poster_url, type, average_rating))')
        .eq('id', id)
        .single();

      if (error) { console.error(error); setLoading(false); return; }

      setPerson(data);

      // group credits by role_type, deduplicating by movie id within each role
      const grouped = {};
      const seen = {};
      for (const credit of data.credits || []) {
        const role = credit.role_type;
        const movie = credit.movies;
        if (!movie) continue;
        const key = `${role}-${movie.id}`;
        if (seen[key]) continue;
        seen[key] = true;
        if (!grouped[role]) grouped[role] = [];
        grouped[role].push(movie);
      }
      setCredits(grouped);
      setLoading(false);
    }
    init();
  }, [id]);

  if (loading) return (
    <div suppressHydrationWarning style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onLogout={() => router.push('/')} />
    </div>
  );

  if (!person) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onLogout={() => router.push('/')} />
      <h1 style={{ color: 'var(--cream)', padding: '100px 40px' }}>Person not found</h1>
    </main>
  );

  const roleGroups = ROLE_ORDER.filter((r) => credits[r]?.length > 0);

  return (
    <main className={styles.container}>
      <Navbar onLogout={() => router.push('/')} />

      <div className={styles.header}>
        {person.photo_url
          ? <img src={person.photo_url} alt={person.name} className={styles.photo} />
          : <div className={styles.photoPlaceholder} />
        }
        <div>
          <h1 className={styles.name}>{person.name}</h1>
          {person.gender && (
            <span className={styles.genderPill}>{person.gender}</span>
          )}
        </div>
      </div>

      {roleGroups.map((role) => (
        <div key={role} className={styles.section}>
          <div className={styles.sectionLabel}>
            <h2>{ROLE_LABELS[role] || role}</h2>
          </div>
          <div className={styles.row}>
            {credits[role].map((movie) => (
              <PosterCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
