// components/Header.js

import Link from 'next/link';
import styles from '../styles/Home.module.css';

/**
 * Header Component
 *
 * Renders the authentication header. If a user is signed in,
 * displays the user's email and a "Sign Out" button; otherwise,
 * shows a "Sign in" link.
 *
 * @param {object} props
 * @param {object} props.currentUser - The current signed-in user (or null).
 * @param {boolean} props.syncPending - Indicates if local changes are pending sync.
 * @param {function} props.signOut - Function to sign out the user.
 */
const Header = ({ currentUser, syncPending, signOut }) => {
  return (
    <div className={styles.header} id="auth-header">
      {currentUser ? (
        <div>
          <span className={syncPending ? styles.emailPending : styles.emailSynced}>
            {currentUser.email}
          </span>
          <button onClick={signOut} className={`${styles.button} ${styles.signoutButton}`}>
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
