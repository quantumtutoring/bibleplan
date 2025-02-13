// components/Header.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

const Header = ({ currentUser, syncPending, signOut, exportToExcel }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Sign out from Firebase.
      await signOut();

      // Remove only user-specific keys from localStorage.
      // Note: "defaultSchedule" is no longer stored.
      localStorage.removeItem("customSchedule");
      localStorage.removeItem("progressMap");
      localStorage.removeItem("customProgressMap");
      localStorage.removeItem("isCustomSchedule");
      localStorage.removeItem("customPlanText");

      // Navigate to the home page.
      await router.push('/');
      
      // Force a full reload so that the PlanComponent remounts.
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
};

export default Header;
