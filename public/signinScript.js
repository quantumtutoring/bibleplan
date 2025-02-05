// public/signinScript.js

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAyrnrL9jPCVrrJ8D2Uf5xbvWNnw6Dtx40",
    authDomain: "biblereadingplan-8cc51.firebaseapp.com",
    projectId: "biblereadingplan-8cc51",
    storageBucket: "biblereadingplan-8cc51.firebasestorage.app",
    messagingSenderId: "29621423913",
    appId: "1:29621423913:web:2f72642305073d8645b138",
    measurementId: "G-QML05S68KS"
  };
  
  // Initialize Firebase if not already initialized
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  /**
   * Helper function to display a message.
   * @param {string} msg - The message text.
   * @param {string} type - Either "error" (red) or "success" (green).
   */
  function showMessage(msg, type) {
    const messageEl = document.getElementById("message");
    if (messageEl) {
      messageEl.textContent = msg;
      messageEl.style.color = type === "error" ? "red" : "green";
    } else {
      console.warn("Message element not found.");
    }
  }
  
  function initSignin() {
    // Sign In function with improved error messaging delivered in the message element
    window.signIn = function (event) {
      event.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((cred) => {
          if (!cred.user.emailVerified) {
            showMessage("Please verify your email address. Check your inbox for the verification link.", "error");
            firebase.auth().signOut();
          } else {
            showMessage("Sign in successful!", "success");
            // Redirect to home page after a brief delay so user can see the success message.
            setTimeout(() => {
              window.location.href = "/";
            }, 1000);
          }
        })
        .catch((error) => {
          console.error("Sign in error:", error);
          if (error.code === "auth/user-not-found") {
            showMessage("We couldn’t find an account with that email. Please check and try again.", "error");
          } else if (error.code === "auth/wrong-password") {
            showMessage("The email or password you entered is incorrect. Please try again.", "error");
          } else if (error.code === "auth/invalid-email") {
            showMessage("The email address is not valid. Please check the format and try again.", "error");
          } else {
            showMessage("Error signing in: " + error.message, "error");
          }
        });
    };
  
    // Sign Up function with improved error messaging
    window.signUp = function (event) {
      event.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((cred) => {
          return cred.user.sendEmailVerification();
        })
        .then(() => {
          showMessage("Verification email sent. Please check your inbox.", "success");
          firebase.auth().signOut();
        })
        .catch((error) => {
          console.error("Sign up error:", error);
          if (error.code === "auth/email-already-in-use") {
            showMessage("An account with this email already exists.", "error");
          } else if (error.code === "auth/invalid-email") {
            showMessage("The email address is not valid.", "error");
          } else if (error.code === "auth/weak-password") {
            showMessage("The password is too weak. Please choose a stronger password.", "error");
          } else {
            showMessage("Error signing up: " + error.message, "error");
          }
        });
    };
  
    // Google Sign In function with error messaging
    window.googleSignIn = function (event) {
      event.preventDefault();
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then((result) => {
          showMessage("Google sign in successful!", "success");
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        })
        .catch((error) => {
          console.error("Google sign in error:", error);
          showMessage("Google sign in error: " + error.message, "error");
        });
    };
  
    // Password Reset function with error messaging
    window.resetPassword = function (event) {
      event.preventDefault();
      const email = document.getElementById("email").value;
      if (!email) {
        showMessage("Please enter your email address to reset your password.", "error");
        return;
      }
      firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
          showMessage("Password reset email sent. Please check your inbox.", "success");
        })
        .catch((error) => {
          console.error("Reset password error:", error);
          if (error.code === "auth/invalid-email") {
            showMessage("The email address is not valid.", "error");
          } else if (error.code === "auth/user-not-found") {
            showMessage("We couldn’t find an account with that email.", "error");
          } else {
            showMessage("Error resetting password: " + error.message, "error");
          }
        });
    };
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSignin);
  } else {
    initSignin();
  }
  
  console.log("Signin script loaded");
  