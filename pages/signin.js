/**
 * Signin.js - Handles user authentication.
 *
 * After successful sign-in:
 * 1. The useEffect below detects that a signed-in, verified user exists.
 * 2. It fetches the user's Firestore document and routes based solely on the
 *    `isCustomSchedule` flag from Firestore.
 *    - If true, the user is routed to "/custom".
 *    - Otherwise, the user is routed to "/".
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
  // State for email, password, messages, etc.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { currentUser, loading } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // Centralized routing logic: once a verified user is detected,
  // fetch Firestore and route based on isCustomSchedule.
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

  // Sign In with Email/Password
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        // If the user isn't verified, send a verification email and sign them out.
        await user.sendEmailVerification();
        setMessage("Your email is not verified. A verification email has been sent.");
        setMsgType("error");
        await auth.signOut();
      } else {
        // Email verified => sign in successful.
        setMessage("Sign in successful!");
        setMsgType("success");
        // No explicit routing here—the useEffect will handle routing once currentUser updates.
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

  // Sign Up (Email/Password) w/ defaults
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

      // Initialize Firestore doc with default mode (false).
      // Here, isCustomSchedule is set to false by default.
      await updateUserData(user.uid, {
        settings: { otChapters, ntChapters, version },
        defaultProgress: progressMap,
        customProgress: customProgressMap,
        customSchedule: customScheduleToStore,
        isCustomSchedule: false
      });

      // Send verification email
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
      await auth.signInWithPopup(provider);
      setMessage("Google sign in successful!");
      setMsgType("success");
      // No explicit routing here—the useEffect will handle it once currentUser updates.
    } catch (error) {
      console.error("[Signin] Google sign in error:", error);
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
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
