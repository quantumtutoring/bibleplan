// components/Header.js
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
// Import Firebase auth directly here
import { auth } from '../lib/firebase';

export default function Header({ currentUser, syncPending, exportToExcel }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // 1) Sign out from Firebase
      await auth.signOut();

      // 2) Remove only user-specific keys from localStorage
      localStorage.removeItem("customSchedule");
      localStorage.removeItem("progressMap");
      localStorage.removeItem("customProgressMap");
      localStorage.removeItem("isCustomSchedule");
      localStorage.removeItem("customPlanText");

      // 3) Navigate to the home page
      await router.push('/');

      // 4) Force a full reload so that the PlanComponent remounts fresh
      router.reload();
    } catch (error) {
      console.error("Sign out error:", error);
    }
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
