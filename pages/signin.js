// pages/signin.js
/**
 * Signin.js
 *
 * This file handles user authentication for the Bible Reading Planner.
 *
 * Overview:
 * 1. On component mount, the code checks the authentication state.
 *    - If a user is already signed in and their email is verified, the app immediately
 *      routes them to their saved Bible version page (retrieved from Firestore).
 *    - Otherwise, the sign‑in form is rendered.
 *
 * 2. The sign‑in form provides multiple authentication options:
 *    - Email/Password Sign In
 *    - Email/Password Sign Up (with default data population)
 *    - Google Sign In
 *    - Password Reset
 *
 * 3. After successful sign in or sign up (and email verification for new users),
 *    the user is redirected to their saved version page.
 *
 * While the authentication state is being determined, the component renders nothing.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth, db } from "../lib/firebase"; // Import Firebase modules (firebase, auth, and Firestore DB).
import styles from "../styles/Signin.module.css";

export default function Signin() {
  // -----------------------------------------------------------
  // 1. State Variables and Router Initialization
  // -----------------------------------------------------------
  // email, password: Hold user credentials.
  // message, msgType: For displaying feedback to the user (error or success messages).
  // shouldRender: Controls whether the sign‑in form should be rendered.
  //              It is initially false, so that the UI does not flash before we check auth state.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // Either "error" or "success"
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  // -----------------------------------------------------------
  // 2. Helper: Route to Version from Firestore
  // -----------------------------------------------------------
  /**
   * routeToVersion
   *
   * Fetches the user's Firestore document to retrieve their saved Bible version.
   * Also updates localStorage with the progress map from Firestore.
   * Redirects the user to the corresponding version page ("/nasb", "/lsb", or "/esv").
   *
   * @param {string} uid - The authenticated user's UID.
   */
  const routeToVersion = async (uid) => {
    try {
      // Get the user document from Firestore.
      const docRef = db.collection("users").doc(uid);
      const docSnap = await docRef.get();
      let route = "/";
      if (docSnap.exists) {
        const userData = docSnap.data();

        // Update localStorage with the user's progress from Firestore (or an empty object if none).
        localStorage.setItem("progressMap", JSON.stringify(userData?.progress || {}));

        // Determine the saved Bible version.
        const storedVersion = userData?.settings?.version;
        if (storedVersion === "lsb") route = "/lsb";
        else if (storedVersion === "esv") route = "/esv";
        else if (storedVersion === "nasb") route = "/nasb";
      }
      // Redirect the browser to the appropriate route.
      window.location.href = route;
    } catch (error) {
      console.error("Error fetching user version:", error);
      // If there is an error, default to redirecting to the homepage.
      window.location.href = "/";
    }
  };

  // -----------------------------------------------------------
  // 3. Early Authentication Check Before Rendering
  // -----------------------------------------------------------
  /**
   * useEffect: Check Authentication State
   *
   * Sets up a Firebase auth listener that determines if a user is already signed in.
   * - If a user exists and their email is verified, immediately redirect to their saved version.
   * - Otherwise, set shouldRender to true so that the sign‑in form is rendered.
   */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // If a user is signed in and their email is verified:
      if (user && user.emailVerified) {
        routeToVersion(user.uid);
      } else {
        // No valid authenticated user; allow rendering of the sign‑in form.
        setShouldRender(true);
      }
    });
    // Cleanup the listener on component unmount.
    return () => unsubscribe();
  }, []);

  // -----------------------------------------------------------
  // 4. Sign In (Email/Password) Handler
  // -----------------------------------------------------------
  /**
   * handleSignIn
   *
   * Handles the sign‑in form submission for email/password authentication.
   * If the user's email is not verified, it shows an error message and signs the user out.
   * Otherwise, it displays a success message and routes the user to their saved version.
   *
   * @param {object} e - The form submit event.
   */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear any previous messages.
    try {
      // Attempt to sign in with email and password.
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Check if the user's email is verified.
      if (!user.emailVerified) {
        setMessage("Please verify your email address. Check your inbox for the verification link.");
        setMsgType("error");
        // Sign the user out if their email isn't verified.
        await auth.signOut();
      } else {
        // Email is verified: Sign in successful.
        setMessage("Sign in successful!");
        setMsgType("success");

        // Route the user to their saved version (also updates localStorage).
        setTimeout(() => {
          routeToVersion(user.uid);
        }, 0);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      // Handle various authentication errors.
      if (error.code === "auth/user-not-found") {
        setMessage("We couldn’t find an account with that email. Please check and try again.");
      } else if (error.code === "auth/wrong-password") {
        setMessage("The email or password you entered is incorrect. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("The email address is not valid. Please check the format and try again.");
      } else {
        setMessage("Error signing in: " + error.message);
      }
      setMsgType("error");
    }
  };

  // -----------------------------------------------------------
  // 5. Sign Up (Email/Password) Handler with Default Data Population
  // -----------------------------------------------------------
  /**
   * handleSignUp
   *
   * Handles account creation for new users.
   * - Retrieves default settings from localStorage (or defaults if not available).
   * - Populates the user's Firestore document with these settings and progress data.
   * - Sends an email verification.
   * - Signs the user out so they must verify their email before signing in.
   *
   * @param {object} e - The form submit event.
   */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      // Create a new user with email and password.
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Retrieve default settings from localStorage or use defaults.
      const otChapters = localStorage.getItem("otChapters") || "2";
      const ntChapters = localStorage.getItem("ntChapters") || "1";
      const version = localStorage.getItem("version") || "nasb";
      const progressMap = localStorage.getItem("progressMap")
        ? JSON.parse(localStorage.getItem("progressMap"))
        : {};

      // Populate the user's Firestore document with the default settings and progress.
      await db.collection("users").doc(user.uid).set(
        {
          settings: { otChapters, ntChapters, version },
          progress: progressMap,
        },
        { merge: true }
      );

      // Send an email verification to the new user.
      await user.sendEmailVerification();
      setMessage("Verification email sent. Please check your inbox.");
      setMsgType("success");

      // Sign the user out to force them to verify their email first.
      await auth.signOut();
    } catch (error) {
      console.error("Sign up error:", error);
      // Handle common sign-up errors.
      if (error.code === "auth/email-already-in-use") {
        setMessage("An account with this email already exists.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("The email address is not valid.");
      } else if (error.code === "auth/weak-password") {
        setMessage("The password is too weak. Please choose a stronger password.");
      } else {
        setMessage("Error signing up: " + error.message);
      }
      setMsgType("error");
    }
  };

  // -----------------------------------------------------------
  // 6. Google Sign In Handler
  // -----------------------------------------------------------
  /**
   * handleGoogleSignIn
   *
   * Handles sign in with Google using a popup.
   * On success, routes the user to their saved version (which also updates localStorage).
   *
   * @param {object} e - The click event.
   */
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      // Sign in using a Google popup.
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      setMessage("Google sign in successful!");
      setMsgType("success");

      // Route the user to their saved version.
      setTimeout(() => {
        routeToVersion(user.uid);
      }, 0);
    } catch (error) {
      console.error("Google sign in error:", error);
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
    }
  };

  // -----------------------------------------------------------
  // 7. Password Reset Handler
  // -----------------------------------------------------------
  /**
   * handleResetPassword
   *
   * Handles sending a password reset email.
   * Checks that the email field is not empty before attempting to send the reset email.
   *
   * @param {object} e - The click event.
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) {
      setMessage("Please enter your email address to reset your password.");
      setMsgType("error");
      return;
    }
    try {
      // Send a password reset email using Firebase auth.
      await auth.sendPasswordResetEmail(email);
      setMessage("Password reset email sent. Please check your inbox.");
      setMsgType("success");
    } catch (error) {
      console.error("Reset password error:", error);
      // Handle errors during password reset.
      if (error.code === "auth/invalid-email") {
        setMessage("The email address is not valid.");
      } else if (error.code === "auth/user-not-found") {
        setMessage("We couldn’t find an account with that email.");
      } else {
        setMessage("Error resetting password: " + error.message);
      }
      setMsgType("error");
    }
  };

  // -----------------------------------------------------------
  // 8. Conditional Rendering: Show Sign-In Form Only When Ready
  // -----------------------------------------------------------
  // If the auth check hasn't completed or a valid user is signed in (and redirected),
  // then nothing is rendered.
  if (!shouldRender) return null;

  // -----------------------------------------------------------
  // 9. Component Rendering: Sign In Form
  // -----------------------------------------------------------
  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Sign In - Bible Reading Plan</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>

      {/* Container for the sign-in form */}
      <div id="signin-container" className={styles.signinContainer}>
        <h2>Sign In</h2>
        <form className={styles.signinForm} onSubmit={handleSignIn}>
          {/* Email Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          {/* Password Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {/* Authentication Buttons */}
          <div className={styles.authButtons}>
            <div className={styles.emailAuth}>
              <button type="submit" className={styles.signIn}>
                Sign In
              </button>
              <button type="button" className={styles.signUp} onClick={handleSignUp}>
                Create Account
              </button>
            </div>
            <button type="button" className={styles.googleSignin} onClick={handleGoogleSignIn}>
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
              />
              Sign in with Google
            </button>
          </div>

          {/* Password Reset */}
          <div className={styles.resetPassword}>
            <button type="button" onClick={handleResetPassword}>
              Forgot your password?
            </button>
          </div>

          {/* Display Feedback Message */}
          {message && (
            <div 
              className={styles.message} 
              style={{ color: msgType === "error" ? "red" : "green" }}
            >
              {message}
            </div>
          )}
        </form>
        {/* Link to navigate back to Home */}
        <div className={styles.backToHome}>
          <Link href="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
