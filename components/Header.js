import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import writeFireStore from '../hooks/writeFireStore';

export default function Header({ currentUser, version, isCustomSchedule, syncPending, exportToExcel }) {
  const router = useRouter();
  const { updateUserData } = writeFireStore();

  const handleSignOut = async () => {
    try {
      // 1) Before signing out, update Firebase with the current version and mode from state.
      if (currentUser) {
        await updateUserData(currentUser.uid, {
          settings: { version, isCustomSchedule }
        });
      }

      // 2) Sign out from Firebase.
      await auth.signOut();

      // 3) Remove user-specific keys from localStorage.
      localStorage.removeItem("customSchedule");
      localStorage.removeItem("progressMap");
      localStorage.removeItem("customProgressMap");
      localStorage.removeItem("customPlanText");

      // 4) Navigate to the home page.
      await router.push('/');

      // 5) Force a full reload so that the PlanComponent remounts fresh.
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
