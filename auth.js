(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const form = byId("auth-form");
  const feedback = byId("feedback");
  const setupWarning = byId("setup-warning");
  const authPanel = byId("auth-panel");
  const sessionPanel = byId("session-panel");
  const submitButton = byId("submit-button");
  const modeToggle = byId("mode-toggle");
  const forgotButton = byId("forgot-button");
  const nameField = byId("name-field");
  const confirmField = byId("confirm-password-field");
  let mode = "signin";
  let client = null;
  let busy = false;

  const showMessage = (message, type = "info") => {
    feedback.textContent = message;
    feedback.className = "message visible " + type;
  };
  const clearMessage = () => {
    feedback.textContent = "";
    feedback.className = "message";
  };
  const setBusy = (state) => {
    busy = state;
    submitButton.disabled = state;
    submitButton.textContent = state ? "Please wait…" : (mode === "signup" ? "Create account" : mode === "recovery" ? "Save new password" : "Sign in");
  };
  const emailRedirectTo = () => window.location.origin + window.location.pathname;

  function setMode(nextMode) {
    mode = nextMode;
    clearMessage();
    const isSignup = mode === "signup";
    const isRecovery = mode === "recovery";
    byId("form-title").textContent = isSignup ? "Create your account." : isRecovery ? "Reset password." : "Welcome back.";
    byId("form-intro").textContent = isSignup
      ? "Create an account with your email and a password you can remember."
      : isRecovery
        ? "Choose a new password for your WR account."
        : "Sign in to your WR account, or create one with your email address.";
    nameField.classList.toggle("hidden", !isSignup);
    confirmField.classList.toggle("hidden", !isSignup && !isRecovery);
    byId("display-name").required = isSignup;
    byId("confirm-password").required = isSignup || isRecovery;
    byId("password").autocomplete = isSignup || isRecovery ? "new-password" : "current-password";
    byId("password-label").textContent = isRecovery ? "New password" : "Password";
    byId("password").placeholder = isSignup || isRecovery ? "At least 8 characters" : "Your password";
    modeToggle.classList.toggle("hidden", isRecovery);
    forgotButton.classList.toggle("hidden", isSignup || isRecovery);
    modeToggle.textContent = isSignup ? "Already have an account? Sign in" : "New here? Create an account";
    setBusy(false);
  }

  function renderSession(session) {
    const user = session && session.user;
    if (user) {
      authPanel.classList.add("hidden");
      sessionPanel.classList.remove("hidden");
      byId("session-email").textContent = user.email || "Email not available";
      byId("session-name").textContent = (user.user_metadata && user.user_metadata.display_name) || "You’re signed in.";
    } else {
      sessionPanel.classList.add("hidden");
      authPanel.classList.remove("hidden");
    }
  }

  const config = window.WR_AUTH_CONFIG || {};
  const looksConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "") &&
    typeof config.supabaseKey === "string" &&
    config.supabaseKey.length > 20 &&
    !config.supabaseKey.includes("YOUR_SUPABASE");

  if (!looksConfigured || !window.supabase || typeof window.supabase.createClient !== "function") {
    setupWarning.classList.add("visible");
    setupWarning.classList.remove("hidden");
    form.querySelectorAll("input,button").forEach((element) => { element.disabled = true; });
    modeToggle.disabled = true;
    forgotButton.disabled = true;
    return;
  }

  client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  modeToggle.addEventListener("click", () => setMode(mode === "signup" ? "signin" : "signup"));

  forgotButton.addEventListener("click", async () => {
    clearMessage();
    const email = byId("email").value.trim();
    if (!email) {
      showMessage("Enter your email address first, then select Forgot password again.", "error");
      byId("email").focus();
      return;
    }
    forgotButton.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo() });
      if (error) throw error;
      showMessage("If an account exists for that address, a password-reset email will be sent. Check your inbox and spam folder.", "success");
    } catch (error) {
      showMessage(error.message || "Could not request a password reset. Try again.", "error");
    } finally {
      forgotButton.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    clearMessage();

    const email = byId("email").value.trim().toLowerCase();
    const password = byId("password").value;
    const confirm = byId("confirm-password").value;

    if (!email || !byId("email").checkValidity()) {
      showMessage("Enter a valid email address.", "error");
      byId("email").focus();
      return;
    }
    if (password.length < 8) {
      showMessage("Use a password with at least 8 characters.", "error");
      byId("password").focus();
      return;
    }
    if ((mode === "signup" || mode === "recovery") && password !== confirm) {
      showMessage("The passwords do not match.", "error");
      byId("confirm-password").focus();
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const displayName = byId("display-name").value.trim();
        if (!displayName) throw new Error("Enter a display name.");
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: emailRedirectTo() }
        });
        if (error) throw error;
        if (data.session) {
          renderSession(data.session);
          showMessage("Account created and signed in.", "success");
        } else {
          setMode("signin");
          showMessage("Account request received. Check your email to confirm the account before signing in.", "success");
        }
      } else if (mode === "recovery") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        byId("password").value = "";
        byId("confirm-password").value = "";
        setMode("signin");
        showMessage("Password updated. Sign in with your new password.", "success");
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        renderSession(data.session);
        showMessage("Signed in successfully.", "success");
      }
    } catch (error) {
      showMessage(error.message || "Authentication failed. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  });

  byId("signout-button").addEventListener("click", async () => {
    clearMessage();
    byId("signout-button").disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      renderSession(null);
      showMessage("You have signed out.", "success");
    } catch (error) {
      showMessage(error.message || "Could not sign out. Please try again.", "error");
    } finally {
      byId("signout-button").disabled = false;
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    renderSession(session);
    if (event === "PASSWORD_RECOVERY") setMode("recovery");
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) showMessage("Could not load your saved session. Refresh the page to retry.", "error");
    renderSession(data && data.session);
    if (window.location.hash.includes("type=recovery")) setMode("recovery");
  });
})();
