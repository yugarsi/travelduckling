import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const auth = getAuth(initializeApp(firebaseConfig));
if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
export {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
};

export function authErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Could not reach the sign-in service. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a bit and try again.",
    "auth/user-disabled": "This account is disabled. Contact support.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/weak-password": "Choose a stronger password (at least 6 characters).",
    "auth/wrong-password": "Email or password is incorrect.",
  };
  return messages[error?.code] || "Authentication failed. Please try again.";
}
