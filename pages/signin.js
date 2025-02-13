// pages/signin.js
/**
 * Signin.js - Main Landing/Routing Page
 *
 * This page handles user authentication. It uses the centralized UserDataContext to check
 * if a user is already signed in. If a user with a verified email is found, it immediately
 * routes them to their saved Bible version page (fetched from Firestore or context).
 * Otherwise, it renders the sign‑in form with options for email/password, Google sign‑in,
 * and password reset.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth } from "../lib/firebase"; // Using compat Firebase
import styles from "../styles/Signin.module.css";
import { useUserDataContext } from "../contexts/UserDataContext";
// Import the unified Firestore write hook.
import useUserDataSync from "../hooks/useUserDataSync";

export default function Signin() {
  // State variables for email, password, and user feedback.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const [shouldRender, setShouldRender] = useState(false);
  const router = useRouter();

  // Consume the centralized user data.
  const { currentUser, userData, loading } = useUserDataContext();
  // Get the unified update function from our hook.
  const { updateUserData } = useUserDataSync();

  /**
   * routeToVersion
   *
   * Routes the user based on their stored Bible version in localStorage.
   */
  const routeToVersion = async (uid) => {
    console.log("[Signin] Routing user with uid:", uid);
    const storedVersion = localStorage.getItem("version");
    let route = "/";
    if (storedVersion === "lsb") route = "/lsb";
    else if (storedVersion === "esv") route = "/esv";
    else if (storedVersion === "nasb") route = "/nasb";
    console.log("[Signin] Routing user to:", route);
    window.location.href = route;
  };

  // useEffect: Check authentication state.
  useEffect(() => {
    if (loading) return;
    if (currentUser && currentUser.emailVerified) {
      routeToVersion(currentUser.uid);
    } else {
      setShouldRender(true);
    }
  }, [loading, currentUser]);

  // Handler: Sign In with Email/Password.
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages.
    try {
      console.log("[Signin] Attempting sign in with email:", email);
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log("[Signin] Sign in successful:", user);
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        setMessage("Your email is not verified. A verification email has been sent.");
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
      console.error("[Signin] Sign in error:", error);
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
      console.log("[Signin] Creating new account for email:", email);
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log("[Signin] Account created:", user);

      // Retrieve default settings from localStorage or use defaults.
      // Parse numeric values so that they are stored correctly.
      const otChapters = localStorage.getItem("otChapters")
        ? Number(JSON.parse(localStorage.getItem("otChapters")))
        : 2;
      const ntChapters = localStorage.getItem("ntChapters")
        ? Number(JSON.parse(localStorage.getItem("ntChapters")))
        : 1;
      const version = localStorage.getItem("version") || "nasb";

      // Retrieve default progress map.
      const progressMap = localStorage.getItem("progressMap")
        ? JSON.parse(localStorage.getItem("progressMap"))
        : {};

      // Retrieve custom progress map.
      const customProgressMap = localStorage.getItem("customProgressMap")
        ? JSON.parse(localStorage.getItem("customProgressMap"))
        : {};

      // Retrieve custom schedule.
      const storedCustomSchedule = localStorage.getItem("customSchedule")
        ? JSON.parse(localStorage.getItem("customSchedule"))
        : null;
      // IMPORTANT: Strip out URL fields from the custom schedule
      // since URLs can be generated later.
      const customScheduleToStore = storedCustomSchedule
        ? storedCustomSchedule.map(item => ({
            day: item.day,
            passages: item.passages,
          }))
        : null;

      console.log("[Signin] Populating Firestore with all local data for new user.");

      // Update Firestore with settings, default progress, custom progress, custom schedule, and planner mode.
      // Note: We're now saving default progress under the key "defaultProgress" and omitting any default schedule passages.
      await updateUserData(user.uid, {
        settings: { otChapters, ntChapters, version },
        defaultProgress: progressMap,
        customProgress: customProgressMap,
        customSchedule: customScheduleToStore,
        isCustomSchedule: false // <-- default planner mode
      });

      // Send an email verification.
      await user.sendEmailVerification();
      setMessage("Verification email sent. Please verify your email and then sign in.");
      setMsgType("success");
      // Optionally, sign the user out immediately.
      await auth.signOut();
    } catch (error) {
      console.error("[Signin] Sign up error:", error);
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
      console.log("[Signin] Attempting Google sign in.");
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      console.log("[Signin] Google sign in successful:", user);
      setMessage("Google sign in successful!");
      setMsgType("success");
      setTimeout(() => {
        routeToVersion(user.uid);
      }, 0);
    } catch (error) {
      console.error("[Signin] Google sign in error:", error);
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
      console.log("[Signin] Sending password reset email to:", email);
      await auth.sendPasswordResetEmail(email);
      setMessage("Password reset email sent. Please check your inbox.");
      setMsgType("success");
    } catch (error) {
      console.error("[Signin] Reset password error:", error);
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

  if (loading) return null;
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
          <div className={styles.resetPassword}>
            <button type="button" onClick={handleResetPassword}>
              Forgot your password?
            </button>
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
