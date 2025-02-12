// components/Header.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

/**
 * Header Component
 *
 * Renders the authentication header. If a user is signed in,
 * displays the user's email, an "Export to Excel" button, and a "Sign Out" button;
 * otherwise, shows a "Sign in" link.
 *
 * @param {object} props
 * @param {object} props.currentUser - The current signed-in user (or null).
 * @param {boolean} props.syncPending - Indicates if local changes are pending sync.
 * @param {function} props.signOut - Function to sign out the user.
 * @param {function} props.exportToExcel - Function to export the schedule to Excel.
 */
const Header = ({ currentUser, syncPending, signOut, exportToExcel }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // First sign out from Firebase.
      await signOut();
      // Then reset localStorage values using JSON.stringify to ensure valid JSON.
      window.localStorage.setItem("version", JSON.stringify("nasb"));
      window.localStorage.setItem("otChapters", JSON.stringify(2));
      window.localStorage.setItem("ntChapters", JSON.stringify(1));
      window.localStorage.setItem("progressMap", JSON.stringify({}));
      window.localStorage.setItem("customProgressMap", JSON.stringify({}));
      window.localStorage.removeItem("defaultSchedule");
      window.localStorage.removeItem("customSchedule");
      // Finally, navigate to the home page.
      router.push('/');
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
