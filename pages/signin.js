// pages/Signin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth } from "../lib/firebase"; // Using compat Firebase
import styles from "../styles/Signin.module.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useListenFireStore } from "../contexts/ListenFireStore";
import writeFireStore from "../hooks/writeFireStore";
import useLocalStorage from "../hooks/useLocalStorage";

export default function Signin() {
  const router = useRouter();
  const { getItem } = useLocalStorage();
  const { currentUser, loading } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // Local states for the auth form.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("");
  const [shouldRender, setShouldRender] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Read default settings from localStorage (used only if no Firestore data yet).
  const defaultVersion = getItem("version", "nasb");
  const defaultIsCustom = getItem("isCustomSchedule", false);
  const defaultOT = getItem("otChapters", "2");
  const defaultNT = getItem("ntChapters", "1");
  const defaultProgressMap = getItem("progressMap", {});
  const defaultCustomProgressMap = getItem("customProgressMap", {});
  const defaultCustomSchedule = getItem("customSchedule", null);

  // When a user is signed in and verified, fetch their Firestore document.
  useEffect(() => {
    if (loading) return;
    if (currentUser && currentUser.emailVerified) {
      const fetchAndRoute = async () => {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Firestore values become the source of truth for the session.
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

  // Sign In handler.
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

  // Sign Up handler: Use localStorage defaults to initialize Firestore.
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      // Save default settings into Firestore.
      await updateUserData(user.uid, {
        version: defaultVersion,
        otChapters: defaultOT,
        ntChapters: defaultNT,
        defaultProgress: defaultProgressMap,
        customProgress: defaultCustomProgressMap,
        customSchedule: defaultCustomSchedule,
        isCustomSchedule: defaultIsCustom,
      });
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
