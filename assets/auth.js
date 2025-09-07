/* global window, localStorage, supabase */
(() => {
  const cfg = window.CONFIG || { mode: "demo" };
  const modeLabel = document.getElementById("modeLabel");
  modeLabel.textContent = cfg.mode === "supabase" ? "REAL (Supabase)" : "DEMO (localStorage)";

  let sb = null;
  if (cfg.mode === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  const tabSignin = document.getElementById("tab-signin");
  const tabSignup = document.getElementById("tab-signup");
  const formSignin = document.getElementById("form-signin");
  const formSignup = document.getElementById("form-signup");

  const show = (el, vis) => { el.classList.toggle("hidden", !vis); }

  // Default to signup visible
  show(formSignup, true);

  tabSignin.addEventListener("click", () => { show(formSignin, true); show(formSignup, false); });
  tabSignup.addEventListener("click", () => { show(formSignup, true); show(formSignin, false); });

  // DEMO helpers
  const demoDB = {
    register(email, password) {
      const users = JSON.parse(localStorage.getItem("mx_users") || "{}");
      if (users[email]) throw new Error("Ya existe un usuario con ese correo");
      users[email] = { email, password };
      localStorage.setItem("mx_users", JSON.stringify(users));
      localStorage.setItem("mx_session", JSON.stringify({ email }));
    },
    signin(email, password) {
      const users = JSON.parse(localStorage.getItem("mx_users") || "{}");
      if (!users[email] || users[email].password !== password) throw new Error("Credenciales inválidas");
      localStorage.setItem("mx_session", JSON.stringify({ email }));
    }
  };

  // SignUp
  formSignup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("su-email").value.trim();
    const pass = document.getElementById("su-pass").value;

    const msg = document.getElementById("su-msg");
    msg.textContent = "";

    try {
      if (sb) {
        const { error } = await sb.auth.signUp({ email, password: pass });
        if (error) throw error;
        localStorage.setItem("mx_session", JSON.stringify({ email }));
        msg.textContent = "Cuenta creada. Redirigiendo al dashboard...";
      } else {
        demoDB.register(email, pass);
        msg.textContent = "Cuenta creada (demo). Redirigiendo...";
      }
      setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
    } catch (err) {
      msg.textContent = err.message || String(err);
    }
  });

  // SignIn
  formSignin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("si-email").value.trim();
    const pass = document.getElementById("si-pass").value;

    const msg = document.getElementById("si-msg");
    msg.textContent = "";

    try {
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        localStorage.setItem("mx_session", JSON.stringify({ email }));
        msg.textContent = "Sesión iniciada. Redirigiendo...";
      } else {
        demoDB.signin(email, pass);
        msg.textContent = "Sesión iniciada (demo). Redirigiendo...";
      }
      setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
    } catch (err) {
      msg.textContent = err.message || String(err);
    }
  });
})();