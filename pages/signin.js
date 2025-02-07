// pages/signin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { firebase, auth, db } from "../lib/firebase"; // <-- Import db as well
import styles from "../styles/Signin.module.css";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState(""); // "error" or "success"
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Listen for auth state changes.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // If user is signed in, fetch their Firestore document.
        try {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          // Update localStorage progressMap with Firestore values.
          // If no progress exists, it will default to an empty object.
          localStorage.setItem("progressMap", JSON.stringify(userData?.progress || {}));

          const storedVersion = userData?.settings?.version;
          // If the version is one of our expected values, redirect immediately.
          if (storedVersion === "lsb" || storedVersion === "esv" || storedVersion === "nasb") {
            router.push(`/${storedVersion}`);
          } else {
            // If there’s no valid version, render the signin page.
            setShouldRender(true);
          }
        } catch (error) {
          console.error("Error fetching user version from Firestore:", error);
          setShouldRender(true);
        }
      } else {
        // If not signed in, simply render the page.
        setShouldRender(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // While waiting for authentication/Firestore, nothing is rendered.
  if (!shouldRender) {
    return null;
  }

  // 1. HELPER: Route to version from Firestore and update localStorage progressMap.
  const routeToVersion = async (uid) => {
    try {
      const docRef = db.collection("users").doc(uid);
      const docSnap = await docRef.get();
      let route = "/";
      if (docSnap.exists) {
        const userData = docSnap.data();

        // Update localStorage progressMap with Firestore values.
        localStorage.setItem("progressMap", JSON.stringify(userData?.progress || {}));

        const storedVersion = userData?.settings?.version;
        if (storedVersion === "lsb") route = "/lsb";
        else if (storedVersion === "esv") route = "/esv";
        else if (storedVersion === "nasb") route = "/nasb";
      }
      // Now actually redirect.
      window.location.href = route;
    } catch (error) {
      console.error("Error fetching user version:", error);
      // If something goes wrong, just go home.
      window.location.href = "/";
    }
  };

  // 2. SIGN IN (Email/Password)
  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // If the user’s email is not verified:
      if (!user.emailVerified) {
        setMessage("Please verify your email address. Check your inbox for the verification link.");
        setMsgType("error");
        await auth.signOut();
      } else {
        // Verified => success.
        setMessage("Sign in successful!");
        setMsgType("success");

        // 2.1 - Route them to their saved version (this will also update localStorage).
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

  // 3. SIGN UP (Email/Password) with initial data population.
  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Retrieve current settings and progress from localStorage.
      // Defaults are provided in case values are missing.
      const otChapters = localStorage.getItem("otChapters") || "2";
      const ntChapters = localStorage.getItem("ntChapters") || "1";
      const version = localStorage.getItem("version") || "nasb";
      const progressMap = localStorage.getItem("progressMap")
        ? JSON.parse(localStorage.getItem("progressMap"))
        : {};

      // Populate initial user data in Firestore.
      await db.collection("users").doc(user.uid).set(
        {
          settings: { otChapters, ntChapters, version },
          progress: progressMap,
        },
        { merge: true }
      );

      await user.sendEmailVerification();
      setMessage("Verification email sent. Please check your inbox.");
      setMsgType("success");
      await auth.signOut(); // Sign them out so they verify first.
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

  // 4. SIGN IN WITH GOOGLE
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      setMessage("Google sign in successful!");
      setMsgType("success");

      // 4.1 - Route them to their saved version (this will also update localStorage).
      setTimeout(() => {
        routeToVersion(user.uid);
      }, 0);
    } catch (error) {
      console.error("Google sign in error:", error);
      setMessage("Google sign in error: " + error.message);
      setMsgType("error");
    }
  };

  // 5. RESET PASSWORD
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

  // RENDER
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
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
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
