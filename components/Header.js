import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import writeFireStore from '../hooks/writeFireStore';

export default function Header({ currentUser, syncPending, exportToExcel, version, isCustomSchedule, resetState }) {
  const router = useRouter();
  const { updateUserData } = writeFireStore();

  const handleSignOut = async () => {
    try {
      // Update Firestore with the current settings ONLY on sign-out.
      if (currentUser) {
        await updateUserData(currentUser.uid, {
          settings: { version, isCustomSchedule }
        });
      }
      await auth.signOut();
      
      // Clear all user-specific localStorage.
      localStorage.clear();

      // Reset the local state in PlanComponent.
      if (resetState) {
        resetState();
      }
      
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
