import {
      auth, authErrorMessage, createUserWithEmailAndPassword, sendEmailVerification,
      signOut, updateProfile
    } from "../../firebase-auth.js";

    const form = document.getElementById("signup-form");
    const status = document.getElementById("signup-status");
    const submit = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      submit.disabled = true;
      submit.textContent = "Creating account…";
      try {
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
        await sendEmailVerification(credential.user);
        await signOut(auth);
        status.textContent = "Account created. Check your email to verify your address, then log in. ID verification for hosting will be a separate step.";
      } catch (error) {
        status.textContent = authErrorMessage(error);
      } finally {
        submit.disabled = false;
        submit.textContent = "Create account";
      }
    });
