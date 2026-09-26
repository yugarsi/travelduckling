import { auth, onAuthStateChanged, signOut } from "../../firebase-auth.js";

const loginLink = document.getElementById("account-login");
const accountMenu = document.getElementById("account-menu");
const accountTrigger = document.getElementById("account-menu-trigger");
const accountPanel = document.getElementById("account-menu-panel");
const accountAvatar = document.getElementById("account-avatar");

if (loginLink && accountMenu && accountTrigger && accountPanel && accountAvatar) {
  onAuthStateChanged(auth, (user) => {
    loginLink.hidden = Boolean(user);
    accountMenu.hidden = !user;
    if (user) {
      accountAvatar.textContent = (user.displayName || user.email || "T").trim().charAt(0).toUpperCase();
    }
  });

  accountTrigger.addEventListener("click", () => {
    const expanded = accountTrigger.getAttribute("aria-expanded") === "true";
    accountTrigger.setAttribute("aria-expanded", String(!expanded));
    accountPanel.hidden = expanded;
  });

  document.addEventListener("click", (event) => {
    if (!accountMenu.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.getElementById("account-sign-out").addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace(document.body.dataset.homeUrl || "/index.html");
    } catch {
      const status = document.getElementById("search-status");
      if (status) status.textContent = "Could not sign out. Please try again.";
    }
  });
}

function closeMenu() {
  accountTrigger.setAttribute("aria-expanded", "false");
  accountPanel.hidden = true;
}
