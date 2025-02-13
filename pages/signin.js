// pages/signin.js
/**
 * Signin.js - Main Landing/Routing Page
 *
 * This page handles user authentication. It uses the centralized ListenFireStore to check
 * if a user is already signed in. If a user with a verified email is found, it immediately
 * routes them to "/" (or wherever you want).
 * Otherwise, it renders the sign-in form with email/password, Google sign-in, and password reset.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth } from "../lib/firebase"; // Using compat Firebase
import styles from "../styles/Signin.module.css";
import { useListenFireStore } from "../contexts/ListenFireStore";
import writeFireStore from "../hooks/writeFireStore";

export default function Signin() {
  // State variables
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { currentUser, loading } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  /**
   * If user is already signed in and email is verified,
   * send them straight to "/".
   */
  useEffect(() => {
    if (loading) return;
    if (currentUser && currentUser.emailVerified) {
      router.push("/");
    } else {
      setShouldRender(true);
    }
  }, [loading, currentUser, router]);

  // Sign In with Email/Password
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        await user.sendEmailVerification();
        setMessage("Your email is not verified. A verification email has been sent.");
        setMsgType("error");
        await auth.signOut();
      } else {
        setMessage("Sign in successful!");
        setMsgType("success");
        setTimeout(() => {
          router.push("/");
        }, 0);
      }
    } catch (error) {
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
      console.error("[Signin] Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up (Email/Password) with default data population
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Optionally read localStorage for default values
      const otChapters = localStorage.getItem("otChapters")
        ? Number(JSON.parse(localStorage.getItem("otChapters")))
        : 2;
      const ntChapters = localStorage.getItem("ntChapters")
        ? Number(JSON.parse(localStorage.getItem("ntChapters")))
        : 1;
      const version = localStorage.getItem("version") || "nasb";
      const progressMap = localStorage.getItem("progressMap")
        ? JSON.parse(localStorage.getItem("progressMap"))
        : {};
      const customProgressMap = localStorage.getItem("customProgressMap")
        ? JSON.parse(localStorage.getItem("customProgressMap"))
        : {};
      const storedCustomSchedule = localStorage.getItem("customSchedule")
        ? JSON.parse(localStorage.getItem("customSchedule"))
        : null;
      const customScheduleToStore = storedCustomSchedule
        ? storedCustomSchedule.map(item => ({
            day: item.day,
            passages: item.passages,
          }))
        : null;

      // Firestore initialization for the new user
      await updateUserData(user.uid, {
        settings: { otChapters, ntChapters, version },
        defaultProgress: progressMap,
        customProgress: customProgressMap,
        customSchedule: customScheduleToStore,
        isCustomSchedule: false
      });

      // Email verification
      await user.sendEmailVerification();
      setMessage("Verification email sent. Please verify your email and then sign in.");
      setMsgType("success");
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
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      setMessage("Google sign in successful!");
      setMsgType("success");
      setTimeout(() => {
        router.push("/");
      }, 0);
    } catch (error) {
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
      console.error("[Signin] Google sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset
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
              <button type="submit" className={styles.signIn} disabled={isLoading}>
                {isLoading ? "Processing..." : "Sign In"}
              </button>
              <button type="button" className={styles.signUp} onClick={handleSignUp} disabled={isLoading}>
                {isLoading ? "Processing..." : "Create Account"}
              </button>
            </div>
            <button type="button" className={styles.googleSignin} onClick={handleGoogleSignIn} disabled={isLoading}>
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
              />
              {isLoading ? "Processing..." : "Sign in with Google"}
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
