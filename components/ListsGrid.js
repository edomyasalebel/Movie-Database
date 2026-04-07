'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ListsGrid.module.css';

export default function ListsGrid() {
  // holds the user's lists once fetched from DB
  const [lists, setLists] = useState([]);

  useEffect(() => {
    async function fetchLists() {
      // Step 1: get the logged-in user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Step 2: fetch this user's lists
      // also count how many movies are in each list using list_items
      const { data, error } = await supabase
        .from('lists')
        .select('id, name, description, created_at, list_items(count)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }); // newest lists first

      if (error) {
        console.error('Error fetching lists:', error.message);
        return;
      }

      setLists(data);
    }

    fetchLists();
  }, []);

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Lists</h3>
      {lists.length === 0 ? (
        <p className={styles.empty}>No lists yet.</p>
      ) : (
        <div className={styles.grid}>
          {lists.map((list) => (
            <div key={list.id} className={styles.card}>

              {/* list icon placeholder */}
              <div className={styles.cover}>📋</div>

              <div className={styles.info}>
                {/* list name */}
                <div className={styles.name}>{list.name}</div>

                {/* film count — list_items(count) gives us [{ count: N }] */}
                <div className={styles.count}>
                  {list.list_items[0]?.count ?? 0} films
                </div>

                {/* optional description */}
                {list.description && (
                  <p className={styles.description}>{list.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
