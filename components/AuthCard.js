'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from './AuthCard.module.css';

export default function AuthCard({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login');

  // form field values
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // error message to show under the form
  const [error, setError] = useState('');

  // loading state while waiting for Supabase response
  const [loading, setLoading] = useState(false);

  // update form state as user types — same as before
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // --- SIGN IN ---
  async function handleSignIn() {
    setError('');     // clear previous errors
    setLoading(true);

    // call Supabase auth with email + password
    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    });

    setLoading(false);

    if (error) {
      // show the error message from Supabase (e.g. "Invalid login credentials")
      setError(error.message);
      return;
    }

    // success — call the onLogin prop which redirects to /home
    onLogin();
  }

  // --- SIGN UP ---
  async function handleSignUp() {
    setError('');
    setLoading(true);

    // create the auth account in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // after creating auth account, also insert into our public.users table
    // data.user.id is the UUID Supabase assigned to this new user
    const { error: profileError } = await supabase.from('users').insert({
      id:           data.user.id,
      username:     form.email.split('@')[0], // use part before @ as default username
      display_name: form.name || form.email.split('@')[0],
      email:        form.email,
    });

    setLoading(false);

    if (profileError) {
      setError('Account created but profile setup failed: ' + profileError.message);
      return;
    }

    // success — redirect to home
    onLogin();
  }

  return (
    <div className={styles.card}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`}
          onClick={() => { setActiveTab('login'); setError(''); }}
        >
          Sign In
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`}
          onClick={() => { setActiveTab('register'); setError(''); }}
        >
          Create Account
        </button>
      </div>

      <div className={styles.body}>
        {activeTab === 'login' ? (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" name="email" placeholder="you@example.com" onChange={handleChange} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input className={styles.input} type="password" name="password" placeholder="••••••••" onChange={handleChange} />
            </div>

            {/* show error message if login fails */}
            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.btnFull} onClick={handleSignIn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className={styles.note}>No account? <span onClick={() => setActiveTab('register')}>Create one →</span></p>
          </>
        ) : (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Display Name</label>
              <input className={styles.input} type="text" name="name" placeholder="e.g. cinephile_99" onChange={handleChange} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" name="email" placeholder="you@example.com" onChange={handleChange} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input className={styles.input} type="password" name="password" placeholder="Create a password" onChange={handleChange} />
            </div>

            {/* show error message if signup fails */}
            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.btnFull} onClick={handleSignUp} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className={styles.note}>Have an account? <span onClick={() => setActiveTab('login')}>Sign in →</span></p>
          </>
        )}
      </div>
    </div>
  );
}
