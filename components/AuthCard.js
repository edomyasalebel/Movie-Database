'use client';
import { useState } from 'react';
import styles from './AuthCard.module.css';

export default function AuthCard({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div className={styles.card}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`} onClick={() => setActiveTab('login')}>Sign In</button>
        <button className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`} onClick={() => setActiveTab('register')}>Create Account</button>
      </div>
      <div className={styles.body}>
        {activeTab === 'login' ? (
          <>
            <div className={styles.fieldGroup}><label className={styles.label}>Email</label><input className={styles.input} type="email" name="email" placeholder="you@example.com" onChange={handleChange} /></div>
            <div className={styles.fieldGroup}><label className={styles.label}>Password</label><input className={styles.input} type="password" name="password" placeholder="••••••••" onChange={handleChange} /></div>
            <button className={styles.btnFull} onClick={onLogin}>Sign In</button>
            <p className={styles.note}>No account? <span onClick={() => setActiveTab('register')}>Create one →</span></p>
          </>
        ) : (
          <>
            <div className={styles.fieldGroup}><label className={styles.label}>Display Name</label><input className={styles.input} type="text" name="name" placeholder="e.g. cinephile_99" onChange={handleChange} /></div>
            <div className={styles.fieldGroup}><label className={styles.label}>Email</label><input className={styles.input} type="email" name="email" placeholder="you@example.com" onChange={handleChange} /></div>
            <div className={styles.fieldGroup}><label className={styles.label}>Password</label><input className={styles.input} type="password" name="password" placeholder="Create a password" onChange={handleChange} /></div>
            <button className={styles.btnFull} onClick={onLogin}>Create Account</button>
            <p className={styles.note}>Have an account? <span onClick={() => setActiveTab('login')}>Sign in →</span></p>
          </>
        )}
      </div>
    </div>
  );
}
