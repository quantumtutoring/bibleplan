// pages/signin.js
import Head from 'next/head';
import Script from 'next/script';
import styles from '../styles/Signin.module.css';
import Link from 'next/link';

export default function Signin() {
  return (
    <>
      <Head>
        <title>Sign In - Bible Reading Plan</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      {/* Load Firebase libraries */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      {/* Load your legacy sign-in script */}
      <Script src="/signinScript.js" strategy="afterInteractive" />

      <div id="signin-container" className={styles.signinContainer}>
        <h2>Sign In</h2>
        <form id="signin-form" className={styles.signinForm}>
          <label>
            Email:
            <input type="email" id="email" required />
          </label>
          <label>
            Password:
            <input type="password" id="password" required />
          </label>
          <div className={styles.authButtons}>
            {/* Email auth buttons in a row */}
            <div className={styles.emailAuth}>
              <button type="button" className={styles.signIn} onClick={(e) => window.signIn(e)}>
                Sign In
              </button>
              <button type="button" className={styles.signUp} onClick={(e) => window.signUp(e)}>
                Create Account
              </button>
            </div>
            {/* Google sign-in button appears below */}
            <button type="button" className={styles.googleSignin} onClick={(e) => window.googleSignIn(e)}>
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
              Sign in with Google
            </button>
          </div>
          <div className={styles.resetPassword}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.resetPassword && window.resetPassword(e);
              }}
            >
              Forgot your password?
            </a>
          </div>
          <div id="message" className={styles.message}></div>
        </form>
      </div>
    </>
  );
}
