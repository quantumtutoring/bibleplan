// pages/signin.js
/**
 * Signin.js
 *
 * This page handles user authentication. It uses the centralized UserDataContext to check
 * if a user is already signed in. If a user with a verified email is found, it immediately
 * routes them to their saved Bible version page (fetched from Firestore).
 * Otherwise, it renders the sign‑in form with options for email/password, Google, and password reset.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth, db } from "../lib/firebase"; // Firebase modules
import styles from "../styles/Signin.module.css";
import { useUserDataContext } from "../contexts/UserDataContext";

export default function Signin() {
  // State variables for email, password, and user feedback.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  // Consume the centralized user data.
  const { currentUser, loading } = useUserDataContext();

  // Helper: routeToVersion
  // Fetches the user's Firestore document to get the saved Bible version and updates localStorage.
  // Then, routes the user to the corresponding version page.
  const routeToVersion = async (uid) => {
    try {
      const docRef = db.collection("users").doc(uid);
      const docSnap = await docRef.get();
      let route = "/";
      if (docSnap.exists) {
        const userData = docSnap.data();
        localStorage.setItem("progressMap", JSON.stringify(userData?.progress || {}));
        const storedVersion = userData?.settings?.version;
        if (storedVersion === "lsb") route = "/lsb";
        else if (storedVersion === "esv") route = "/esv";
        else if (storedVersion === "nasb") route = "/nasb";
      }
      window.location.href = route;
    } catch (error) {
      console.error("Error fetching user version:", error);
      window.location.href = "/";
    }
  };

  // useEffect: Check authentication state via the centralized context.
  useEffect(() => {
    if (loading) return;
    // --- If a user is signed in and their email is verified, redirect immediately.
    if (currentUser && currentUser.emailVerified) {
      routeToVersion(currentUser.uid);
    } else {
      // Otherwise, allow the sign‑in form to render.
      setShouldRender(true);
    }
  }, [loading, currentUser]);

  // Handler: Sign In with Email/Password.
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages.
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        setMessage("Please verify your email address. Check your inbox for the verification link.");
        setMsgType("error");
        await auth.signOut();
      } else {
        setMessage("Sign in successful!");
        setMsgType("success");
        setTimeout(() => {
          routeToVersion(user.uid);
        }, 0);
      }
    } catch (error) {
      console.error("Sign in error:", error);
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

  // Handler: Sign Up (Email/Password) with default data population.
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Retrieve default settings from localStorage (or use defaults).
      const otChapters = localStorage.getItem("otChapters") || "2";
      const ntChapters = localStorage.getItem("ntChapters") || "1";
      const version = localStorage.getItem("version") || "nasb";
      const progressMap = localStorage.getItem("progressMap")
        ? JSON.parse(localStorage.getItem("progressMap"))
        : {};

      // Populate Firestore with the new user's settings and progress.
      await db.collection("users").doc(user.uid).set(
        {
          settings: { otChapters, ntChapters, version },
          progress: progressMap,
        },
        { merge: true }
      );

      // Send an email verification.
      await user.sendEmailVerification();
      setMessage("Verification email sent. Please check your inbox.");
      setMsgType("success");
      // Sign out so the user must verify before signing in.
      await auth.signOut();
    } catch (error) {
      console.error("Sign up error:", error);
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

  // Handler: Google Sign In.
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      setMessage("Google sign in successful!");
      setMsgType("success");
      setTimeout(() => {
        routeToVersion(user.uid);
      }, 0);
    } catch (error) {
      console.error("Google sign in error:", error);
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
    }
  };

  // Handler: Password Reset.
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) {
      setMessage("Please enter your email address to reset your password.");
      setMsgType("error");
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      setMessage("Password reset email sent. Please check your inbox.");
      setMsgType("success");
    } catch (error) {
      console.error("Reset password error:", error);
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

  // Render nothing until our authentication check is complete.
  if (!shouldRender) return null;

  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Sign In - Bible Reading Plan</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <div id="signin-container" className={styles.signinContainer}>
        <h2>Sign In</h2>
        <form className={styles.signinForm} onSubmit={handleSignIn}>
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
          <div className={styles.authButtons}>
            <div className={styles.emailAuth}>
              <button type="submit" className={styles.signIn}>Sign In</button>
              <button type="button" className={styles.signUp} onClick={handleSignUp}>Create Account</button>
            </div>
            <button type="button" className={styles.googleSignin} onClick={handleGoogleSignIn}>
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
              />
              Sign in with Google
            </button>
          </div>
          <div className={styles.resetPassword}>
            <button type="button" onClick={handleResetPassword}>Forgot your password?</button>
          </div>
          {message && (
            <div 
              className={styles.message} 
              style={{ color: msgType === "error" ? "red" : "green" }}
            >
              {message}
            </div>
          )}
        </form>
        <div className={styles.backToHome}>
          <Link href="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
