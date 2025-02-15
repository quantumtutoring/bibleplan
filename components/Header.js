// Header.js
import Link from 'next/link';
import useSignOut from '../hooks/useSignOut';
import styles from '../styles/Home.module.css';

export default function Header({
  currentUser,
  syncPending,
  version,
  isCustomSchedule,
  resetState,
  onSignOut,
  fadeDuration, // passed from PlanComponent if needed
}) {
  const signOut = useSignOut({ currentUser, version, isCustomSchedule, resetState });
  
  const handleSignOut = () => {
    // Notify the parent that sign out has begun.
    if (onSignOut && typeof onSignOut === 'function') {
      onSignOut();
    }
    // Delay the actual sign-out to allow the fade-out animation to play.
    setTimeout(() => {
      signOut();
    }, fadeDuration);
  };

  return (
    <div className={styles.header} id="auth-header">
      {currentUser ? (
        <div>
          <span className={syncPending ? styles.emailPending : styles.emailSynced}>
            {currentUser.email}
          </span>
          <button
            onClick={handleSignOut}
            className={`${styles.button} ${styles.signoutButton}`}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <Link href="/signin">Sign in</Link>
      )}
    </div>
  );
}
