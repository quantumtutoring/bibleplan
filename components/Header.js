import Link from 'next/link';
import styles from '../styles/Home.module.css';
import useSignOut from '../hooks/useSignOut';

export default function Header({ currentUser, syncPending, exportToExcel, version, isCustomSchedule, resetState }) {
  const signOut = useSignOut({ currentUser, version, isCustomSchedule, resetState });

  return (
    <div className={styles.header} id="auth-header">
      {currentUser ? (
        <div>
          <span className={syncPending ? styles.emailPending : styles.emailSynced}>
            {currentUser.email}
          </span>
          <button
            onClick={signOut}
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
