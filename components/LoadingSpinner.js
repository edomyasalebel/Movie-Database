// reusable loading component used across all pages
// uses the animated SVG from public/brand/loading.svg
import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner() {
  return (
    <div className={styles.wrapper}>
      {/* the animated SVG logo spinner */}
      <img
        src="/brand/loading.svg"
        alt="Loading..."
        className={styles.spinner}
      />
    </div>
  );
}
