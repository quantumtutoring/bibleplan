import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import writeFireStore from '../hooks/writeFireStore';

export default function Header({ currentUser, syncPending, exportToExcel, version, isCustomSchedule }) {
  const router = useRouter();
  const { updateUserData } = writeFireStore();

  const handleSignOut = async () => {
    try {
      // Update Firestore with the current version and mode (from state/PlanComponent)
      if (currentUser) {
        await updateUserData(currentUser.uid, {
          settings: { version, isCustomSchedule }
        });
      }
      await auth.signOut();

      // Remove user-specific keys from localStorage.
      localStorage.removeItem("customSchedule");
      localStorage.removeItem("progressMap");
      localStorage.removeItem("customProgressMap");
      localStorage.removeItem("customPlanText");

      await router.push('/');
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
