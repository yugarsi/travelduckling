import {
      auth, authErrorMessage, sendEmailVerification, sendPasswordResetEmail,
      signInWithEmailAndPassword, signOut
    } from "../../firebase-auth.js";

    const form = document.getElementById("login-form");
    const status = document.getElementById("login-status");
    const submit = form.querySelector("button[type=submit]");
    const emailField = document.getElementById("email");
    const nextParam = new URLSearchParams(location.search).get("next");
    const nextUrl = new URL(nextParam || "../index.html", location.href);
    const returnTo = nextUrl.origin === location.origin
      ? `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
      : "../index.html";

    document.getElementById("forgot-password-link").addEventListener("click", async (event) => {
      event.preventDefault();
      if (!emailField.value.trim()) {
        status.textContent = "Enter your email address first, then choose Forgot password again.";
        emailField.focus();
        return;
      }
      try {
        await sendPasswordResetEmail(auth, emailField.value.trim());
        status.textContent = "If an account exists for that email, a password reset link has been sent.";
      } catch (error) {
        status.textContent = authErrorMessage(error);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      submit.disabled = true;
      submit.textContent = "Signing in…";
      try {
        const credential = await signInWithEmailAndPassword(
          auth, emailField.value.trim(), document.getElementById("password").value
        );
        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          await signOut(auth);
          status.textContent = "Verify your email using the link we just sent, then log in.";
          return;
        }
        location.assign(returnTo);
      } catch (error) {
        status.textContent = authErrorMessage(error);
      } finally {
        submit.disabled = false;
        submit.textContent = "Log in";
      }
    });
