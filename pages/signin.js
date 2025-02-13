/**
 * Signin.js - Handles user authentication.
 *
 * This file uses React state (with defaults) to track version and mode.
 * If query parameters are provided (e.g. ?version=esv&mode=custom), they override the defaults.
 *
 * After a successful sign-up, the Firestore user document is initialized with these state values.
 * Then, after sign-in, a useEffect fetches the user document and routes based on isCustomSchedule.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth } from "../lib/firebase"; // Using compat Firebase
import styles from "../styles/Signin.module.css";

// Import Firestore methods for a direct getDoc call
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

import { useListenFireStore } from "../contexts/ListenFireStore";
import writeFireStore from "../hooks/writeFireStore";

export default function Signin() {
  const router = useRouter();
  const { query } = router;
  const { currentUser, loading } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // Local states for auth form.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track version and mode entirely in state.
  // Defaults: version "nasb" and default mode (isCustomSchedule false).
  const [version, setVersion] = useState("nasb");
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);

  // Optional: override defaults from URL query parameters.
  useEffect(() => {
    if (query.version) {
      setVersion(query.version);
    }
    if (query.mode) {
      // Expecting mode to be "custom" or "default"
      setIsCustomSchedule(query.mode === "custom");
    }
  }, [query]);

  // Once the user is signed in and verified, fetch their Firestore doc and route accordingly.
  useEffect(() => {
    if (loading) return;
    if (currentUser && currentUser.emailVerified) {
      const fetchAndRoute = async () => {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.isCustomSchedule === true) {
              console.log("Routing to /custom based on Firestore");
              router.push("/custom");
            } else {
              console.log("Routing to / based on Firestore");
              router.push("/");
            }
          } else {
            console.warn("No user doc found; defaulting to /");
            router.push("/");
          }
        } catch (error) {
          console.error("Error fetching Firestore doc:", error);
          router.push("/");
        }
      };
      fetchAndRoute();
    } else {
      setShouldRender(true);
    }
  }, [loading, currentUser, router]);

  // Sign In handler remains unchanged.
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
        // Routing is handled by the effect above.
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
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up handler: uses state for version and mode.
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      // For a new user, we use our state values.
      // Here we assume OT and NT defaults remain as defined.
      const otChaptersDefault = 2;
      const ntChaptersDefault = 1;
      const progressMap = {};
      const customProgressMap = {};
      const customScheduleToStore = null;

      // Initialize Firestore doc with the state values.
      await updateUserData(user.uid, {
        settings: { otChapters: otChaptersDefault, ntChapters: ntChaptersDefault, version },
        defaultProgress: progressMap,
        customProgress: customProgressMap,
        customSchedule: customScheduleToStore,
        isCustomSchedule
      });

      // Send verification email.
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

  // Google Sign In handler.
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      setMessage("Google sign in successful!");
      setMsgType("success");
      // Routing will be handled by the effect above.
    } catch (error) {
      console.error("[Signin] Google sign in error:", error);
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset handler.
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
              <button 
                type="submit" 
                className={styles.signIn} 
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Sign In"}
              </button>
              <button 
                type="button" 
                className={styles.signUp} 
                onClick={handleSignUp} 
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Create Account"}
              </button>
            </div>
            <button
              type="button"
              className={styles.googleSignin}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
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
