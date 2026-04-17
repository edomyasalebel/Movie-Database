'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';
import styles from './page.module.css';

const EXAMPLES = [
  { label: 'Top rated movies',      sql: 'SELECT title, release_year, country, average_rating\nFROM movies\nORDER BY average_rating DESC\nLIMIT 10' },
  { label: 'Most reviewed movies',  sql: 'SELECT m.title, COUNT(r.id) AS review_count, AVG(r.rating) AS avg_rating\nFROM movies m\nJOIN reviews r ON r.movie_id = m.id\nGROUP BY m.id, m.title\nORDER BY review_count DESC\nLIMIT 10' },
  { label: 'Movies by genre',       sql: 'SELECT g.name AS genre, COUNT(mg.movie_id) AS count\nFROM genres g\nJOIN movie_genres mg ON mg.genre_id = g.id\nGROUP BY g.name\nORDER BY count DESC' },
  { label: 'Most active users',     sql: 'SELECT u.username, COUNT(r.id) AS reviews\nFROM users u\nJOIN reviews r ON r.user_id = u.id\nGROUP BY u.username\nORDER BY reviews DESC\nLIMIT 10' },
  { label: 'Recent diary entries',  sql: 'SELECT u.username, m.title, d.watched_date, d.rewatch\nFROM diary d\nJOIN users u ON u.id = d.user_id\nJOIN movies m ON m.id = d.movie_id\nORDER BY d.watched_date DESC\nLIMIT 20' },
  { label: 'All tables',            sql: "SELECT table_name FROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name" },
];

const TABLES = ['movies', 'users', 'reviews', 'diary', 'watchlist', 'watched', 'lists', 'list_items', 'favorites', 'genres', 'people', 'credits', 'studios'];

export default function SQLPage() {
  const router = useRouter();
  const [query, setQuery]       = useState('SELECT title, release_year, average_rating\nFROM movies\nORDER BY average_rating DESC\nLIMIT 10');
  const [rows, setRows]         = useState(null);
  const [columns, setColumns]   = useState([]);
  const [running, setRunning]   = useState(false);
  const [error, setError]       = useState('');
  const [elapsed, setElapsed]   = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }
      const { data: profile } = await supabase
        .from('users').select('admin_access').eq('id', session.user.id).single();
      if (!profile?.admin_access) { router.replace('/home'); return; }
      setAuthChecked(true);
    }
    checkAdmin();
  }, []);

  // clear results when query is edited
  useEffect(() => {
    setRows(null); setColumns([]); setError(''); setElapsed(null);
  }, [query]);

  // Cmd/Ctrl + Enter to run
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runQuery();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [query]);

  async function runQuery() {
    const q = query.trim();
    if (!q) return;

    // client-side guard: only SELECT
    if (!q.toUpperCase().startsWith('SELECT')) {
      setError('Only SELECT queries are allowed.');
      setRows(null);
      return;
    }

    setRunning(true); setError(''); setRows(null); setColumns([]);
    const t0 = performance.now();

    const { data, error: rpcError } = await supabase.rpc('execute_query', { query_text: q });

    const ms = Math.round(performance.now() - t0);
    setElapsed(ms);
    setRunning(false);

    if (rpcError) { setError(rpcError.message); return; }

    const result = Array.isArray(data) ? data : (data ? [data] : []);
    if (result.length === 0) { setRows([]); setColumns([]); return; }

    setColumns(Object.keys(result[0]));
    setRows(result);
  }

  function loadExample(sql) { setQuery(sql); setRows(null); setError(''); }

  function insertTable(table) {
    const snippet = `SELECT * FROM ${table} LIMIT 10;`;
    setQuery(snippet);
    textareaRef.current?.focus();
  }

  if (!authChecked) return null;

  return (
    <main className={styles.page}>
      <Navbar onLogout={() => router.push('/')} />

      <div className={styles.layout}>

        {/* ── sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>Tables</div>
            {TABLES.map((t) => (
              <button key={t} className={styles.tableBtn} onClick={() => insertTable(t)}>
                <span className={styles.tableIcon}>▤</span> {t}
              </button>
            ))}
          </div>

          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>Examples</div>
            {EXAMPLES.map((ex) => (
              <button key={ex.label} className={styles.exampleBtn} onClick={() => loadExample(ex.sql)}>
                {ex.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── main panel ── */}
        <div className={styles.main}>

          {/* editor */}
          <div className={styles.editorWrap}>
            <div className={styles.editorHeader}>
              <span className={styles.editorTitle}>SQL Editor</span>
              <span className={styles.hint}>SELECT only · <kbd>⌘ Enter</kbd> to run</span>
            </div>
            <textarea
              ref={textareaRef}
              className={styles.editor}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
              rows={8}
            />
            <div className={styles.editorFooter}>
              <button className={styles.runBtn} onClick={runQuery} disabled={running}>
                {running ? '⏳ Running...' : '▶ Run Query'}
              </button>
              {elapsed !== null && !error && (
                <span className={styles.elapsed}>{elapsed} ms</span>
              )}
            </div>
          </div>

          {/* error */}
          {error && <div className={styles.error}>{error}</div>}

          {/* results */}
          {rows !== null && !error && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                {rows.length === 0
                  ? 'No rows returned.'
                  : `${rows.length} row${rows.length !== 1 ? 's' : ''} · ${elapsed} ms`}
              </div>
              {rows.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {columns.map((col) => <th key={col} className={styles.th}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={styles.tr}>
                          {columns.map((col) => (
                            <td key={col} className={styles.td}>
                              {row[col] === null
                                ? <span className={styles.null}>NULL</span>
                                : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
