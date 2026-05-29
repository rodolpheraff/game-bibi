/* =====================================================================
   LOGIQUE — Jeu "Vous Deux"
   Manche 1 : A répond sur lui-même → B devine.
   Manche 2 : B répond sur lui-même → A devine.
   Puis : love-o-mètre + verdict.
   ===================================================================== */

const app = document.getElementById("app");

/* ---------- État du jeu ---------- */
const S = {
  screen: "home",
  A: "",
  B: "",
  count: 20,
  cats: new Set(["amour", "fun", "profond", "couple"]),
  deck: [],
  round: 1,
  qi: 0,
  selected: null,
  revealed: false,
  truth: { 1: [], 2: [] }, // bonnes réponses : R1 = A sur A, R2 = B sur B
  guess: { 1: [], 2: [] }, // devinettes  : R1 = B devine A, R2 = A devine B
};

/* Souvenir des prénoms d'une partie à l'autre */
try {
  const saved = JSON.parse(localStorage.getItem("vousdeux") || "{}");
  if (saved.A) S.A = saved.A;
  if (saved.B) S.B = saved.B;
} catch (e) {}

function persist() {
  try { localStorage.setItem("vousdeux", JSON.stringify({ A: S.A, B: S.B })); } catch (e) {}
}

/* Suivi des questions déjà jouées (pour ne pas les revoir avant d'avoir tout fait).
   IMPORTANT : on garde l'ensemble EN MÉMOIRE VIVE (seenSet), pas seulement dans le
   localStorage. Ainsi, même si le localStorage est indisponible (navigation privée,
   etc.), rejouer ne redonne JAMAIS les questions de la partie précédente.
   Le localStorage sert juste de bonus pour s'en souvenir d'une session à l'autre. */
const SEEN_KEY = "vousdeux_seen";
function loadSeenFromStorage() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch (e) { return new Set(); }
}
let seenSet = loadSeenFromStorage(); // source de vérité, en mémoire

function markSeen(list) {
  list.forEach((q) => seenSet.add(q));
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seenSet])); } catch (e) {}
}
function resetSeen() {
  seenSet = new Set();
  try { localStorage.removeItem(SEEN_KEY); } catch (e) {}
}

/* Qui répond / qui devine selon la manche */
function truthPerson() { return S.round === 1 ? S.A : S.B; }
function guessPerson() { return S.round === 1 ? S.B : S.A; }

/* ---------- Utilitaires ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const pool = QUESTIONS.filter((q) => S.cats.has(q.cat));
  const n = Math.min(S.count, pool.length);
  const unseen = pool.filter((q) => !seenSet.has(q.q));

  let chosen;
  if (unseen.length >= n) {
    // assez de questions jamais vues : on pioche dedans
    chosen = shuffle(unseen).slice(0, n);
  } else {
    // plus assez de nouvelles → on prend toutes les nouvelles + on complète avec des anciennes
    const need = n - unseen.length;
    const reused = shuffle(pool.filter((q) => seenSet.has(q.q))).slice(0, need);
    chosen = shuffle(unseen.concat(reused));
  }

  // on mélange aussi l'ordre des choix → encore plus de rejouabilité
  S.deck = chosen.map((q) => ({ ...q, o: shuffle(q.o) }));
  markSeen(S.deck.map((q) => q.q)); // ces questions sont maintenant "vues"
}

function go(screen) { S.screen = screen; render(); }

/* ===================================================================
   ÉCRANS
   =================================================================== */

function render() {
  switch (S.screen) {
    case "home":      return screenHome();
    case "setup":     return screenSetup();
    case "intro":     return screenRoundIntro();
    case "truth":     return screenQuestion("truth");
    case "guessIntro":return screenGuessIntro();
    case "guess":     return screenQuestion("guess");
    case "results":   return screenResults();
    case "recap":     return screenRecap();
  }
}

/* ---------- Accueil ---------- */
function screenHome() {
  app.innerHTML = `
    <div class="card">
      <div class="logo">Vous Deux 💞</div>
      <div class="tagline">Jusqu'où vous connaissez-vous vraiment ?</div>
      <label for="nA">Joueur A</label>
      <input id="nA" type="text" placeholder="Prénom..." value="${esc(S.A)}" maxlength="14" autocomplete="off">
      <label for="nB">Joueur B</label>
      <input id="nB" type="text" placeholder="Prénom..." value="${esc(S.B)}" maxlength="14" autocomplete="off">
      <button class="btn" id="next">Continuer →</button>
      <div class="seen-line" id="seenLine"></div>
    </div>
    <div class="footer-note">Sur un seul téléphone · à tour de rôle 🤝</div>
  `;
  const nA = document.getElementById("nA");
  const nB = document.getElementById("nB");
  const btn = document.getElementById("next");
  function check() { btn.disabled = !nA.value.trim() || !nB.value.trim(); }
  nA.oninput = nB.oninput = check;
  check();
  btn.onclick = () => {
    S.A = nA.value.trim();
    S.B = nB.value.trim();
    persist();
    go("setup");
  };

  // Compteur de progression + bouton remise à zéro
  const seenCount = seenSet.size;
  const seenLine = document.getElementById("seenLine");
  if (seenCount > 0) {
    seenLine.innerHTML = `<span>🎯 ${seenCount} / ${QUESTIONS.length} questions déjà jouées</span>
      <button class="reset-link" id="reset">🔄 Tout remettre à zéro</button>`;
    document.getElementById("reset").onclick = () => {
      if (confirm("Remettre toutes les questions à zéro ? Vous pourrez retomber sur les questions déjà jouées.")) {
        resetSeen();
        screenHome();
      }
    };
  }
}

/* ---------- Réglages : nombre de questions + catégories ---------- */
function screenSetup() {
  const counts = [10, 20, 40];
  const catRows = Object.entries(CATEGORIES).map(([key, c]) => {
    const on = S.cats.has(key);
    return `<div class="cat-row ${on ? "on" : ""}" data-cat="${key}" style="color:${c.color}">
      <span class="emoji">${c.emoji}</span>
      <span class="name" style="color:var(--ink)">${c.label}</span>
      <span class="check">${on ? "✓" : ""}</span>
    </div>`;
  }).join("");

  app.innerHTML = `
    <div class="card">
      <h2>Réglages de la partie</h2>
      <p class="sub">Choisis combien de questions par manche, et les thèmes qui vous correspondent.</p>

      <label>Nombre de questions (par manche)</label>
      <div class="choice-grid">
        ${counts.map((c) => `<div class="chip ${S.count === c ? "active" : ""}" data-count="${c}">${c}<small>questions</small></div>`).join("")}
      </div>

      <label style="margin-top:22px">Thèmes des questions</label>
      <div class="cat-list">${catRows}</div>

      <button class="btn" id="start">C'est parti ! 💘</button>
      <button class="btn ghost" id="back">← Retour</button>
    </div>
  `;

  app.querySelectorAll(".chip").forEach((el) => {
    el.onclick = () => { S.count = +el.dataset.count; screenSetup(); };
  });
  app.querySelectorAll(".cat-row").forEach((el) => {
    el.onclick = () => {
      const k = el.dataset.cat;
      if (S.cats.has(k)) S.cats.delete(k); else S.cats.add(k);
      if (S.cats.size === 0) S.cats.add(k); // toujours au moins un thème
      screenSetup();
    };
  });
  document.getElementById("back").onclick = () => go("home");
  document.getElementById("start").onclick = () => {
    buildDeck();
    S.round = 1; S.qi = 0;
    S.truth = { 1: [], 2: [] };
    S.guess = { 1: [], 2: [] };
    go("intro");
  };
}

/* ---------- Intro de manche (passe le téléphone à celui qui répond) ---------- */
function screenRoundIntro() {
  const who = truthPerson();
  const other = guessPerson();
  app.innerHTML = `
    <div class="card handoff">
      <div class="big-emoji">📱➡️</div>
      <h2>Manche ${S.round} / 2</h2>
      <p class="sub">On va voir si <span class="who">${esc(other)}</span> connaît bien <span class="who">${esc(who)}</span>.</p>
      <div class="warn">📲 <b>${esc(who)}</b>, prends le téléphone et réponds <b>sur toi-même</b>.<br>
        <b>${esc(other)}</b>, ne regarde pas ! 🙈</div>
      <button class="btn" id="go">Je suis ${esc(who)}, c'est parti</button>
    </div>
  `;
  document.getElementById("go").onclick = () => { S.qi = 0; S.selected = null; go("truth"); };
}

/* ---------- Intro phase devinette ---------- */
function screenGuessIntro() {
  const guesser = guessPerson();
  const truth = truthPerson();
  app.innerHTML = `
    <div class="card handoff">
      <div class="big-emoji">🔮</div>
      <h2>À toi de deviner !</h2>
      <p class="sub">Passe le téléphone à <span class="who">${esc(guesser)}</span>.</p>
      <div class="warn">🧠 <b>${esc(guesser)}</b>, devine ce qu'a répondu <b>${esc(truth)}</b> pour chaque question. On verra tout de suite si ça matche !</div>
      <button class="btn" id="go">Je suis ${esc(guesser)}, je devine</button>
    </div>
  `;
  document.getElementById("go").onclick = () => { S.qi = 0; S.selected = null; S.revealed = false; go("guess"); };
}

/* ---------- Question (mode "truth" ou "guess") ---------- */
function screenQuestion(mode) {
  const q = S.deck[S.qi];
  const cat = CATEGORIES[q.cat];
  const total = S.deck.length;
  const pct = Math.round((S.qi / total) * 100);

  const intro = mode === "truth"
    ? `${esc(truthPerson())}, ta vraie réponse :`
    : `Selon toi, qu'a répondu ${esc(truthPerson())} ?`;

  app.innerHTML = `
    <div class="card">
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="meta-row">
        <span class="cat-tag" style="background:${cat.color}">${cat.emoji} ${cat.label}</span>
        <span>${S.qi + 1} / ${total}</span>
      </div>
      <p class="sub" style="margin:6px 0 0">${intro}</p>
      <div class="q-text">${esc(q.q)}</div>
      <div class="options" id="opts">
        ${q.o.map((opt, i) => `
          <button class="option" data-i="${i}">
            <span class="dot"></span><span>${esc(opt)}</span>
          </button>`).join("")}
      </div>
      <button class="btn" id="next" disabled>${mode === "guess" ? "Valider" : "Suivant →"}</button>
    </div>
  `;

  const opts = app.querySelectorAll(".option");
  const nextBtn = document.getElementById("next");

  opts.forEach((el) => {
    el.onclick = () => {
      if (S.revealed) return; // déjà révélé, on ne change plus
      S.selected = +el.dataset.i;
      opts.forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      nextBtn.disabled = false;
    };
  });

  nextBtn.onclick = () => {
    if (mode === "truth") {
      S.truth[S.round][S.qi] = S.selected;
      advance(mode);
    } else {
      // mode guess : on enregistre, on révèle, puis le bouton passe à la suite
      if (!S.revealed) {
        S.guess[S.round][S.qi] = S.selected;
        revealGuess(q, opts, nextBtn);
      } else {
        advance(mode);
      }
    }
  };
}

function revealGuess(q, opts, nextBtn) {
  S.revealed = true;
  const correct = S.truth[S.round][S.qi];
  const guessed = S.guess[S.round][S.qi];
  opts.forEach((el) => {
    const i = +el.dataset.i;
    el.classList.remove("selected");
    if (i === correct) {
      el.classList.add("correct");
      el.insertAdjacentHTML("beforeend", `<span class="tag-mini" style="color:#2ec16f">✓ sa réponse</span>`);
    }
    if (i === guessed && guessed !== correct) {
      el.classList.add("wrong");
      el.insertAdjacentHTML("beforeend", `<span class="tag-mini" style="color:#ff5c7a">ton choix</span>`);
    }
  });
  const ok = guessed === correct;
  nextBtn.textContent = ok ? "Bravo ! Suivant →" : "Raté 😅 Suivant →";
}

function advance(mode) {
  S.selected = null;
  S.revealed = false;
  S.qi++;
  if (S.qi < S.deck.length) {
    render();
    return;
  }
  // fin d'une phase
  if (mode === "truth") {
    go("guessIntro"); // on passe à la devinette de la même manche
  } else {
    if (S.round === 1) { S.round = 2; S.qi = 0; go("intro"); }
    else { computeAndShow(); }
  }
}

/* ===================================================================
   RÉSULTATS
   =================================================================== */
function score(round) {
  let m = 0;
  for (let i = 0; i < S.deck.length; i++) {
    if (S.guess[round][i] === S.truth[round][i]) m++;
  }
  return m;
}

function computeAndShow() { go("results"); }

function verdictFor(p) {
  if (p >= 90) return ["Âmes sœurs absolues 💞", "C'est limite flippant : vous lisez dans les pensées l'un de l'autre. Ne changez rien !"];
  if (p >= 75) return ["Duo de choc ❤️", "Vous vous connaissez vraiment bien. Bravo les amoureux !"];
  if (p >= 55) return ["Beau complice 💛", "Solide ! Reste quelques jolis secrets à découvrir ensemble."];
  if (p >= 35) return ["En apprentissage 🌷", "Vous avez de quoi papoter ce soir... et c'est tout l'intérêt !"];
  return ["Grande découverte 🌱", "Surprise ! Il vous reste plein de choses à apprendre l'un de l'autre. Le plus beau est à venir."];
}

function screenResults() {
  const total = S.deck.length;
  const m1 = score(1); // B connaît A
  const m2 = score(2); // A connaît B
  const pct = Math.round(((m1 + m2) / (total * 2)) * 100);
  const [vt, vd] = verdictFor(pct);

  const pctB = Math.round((m1 / total) * 100); // B connaît A
  const pctA = Math.round((m2 / total) * 100); // A connaît B

  // petit défi tendre pour celui qui connaît le moins bien l'autre
  let gage = "";
  if (pctA !== pctB) {
    const loser = pctA < pctB ? S.A : S.B;
    const winner = pctA < pctB ? S.B : S.A;
    gage = `<div class="gage">
      <h3>Petit défi 😏</h3>
      <p><b>${esc(loser)}</b> connaît un peu moins bien <b>${esc(winner)}</b>...
      Mini-gage : un compliment sincère + un câlin de 20 secondes ! 🤗</p>
    </div>`;
  } else {
    gage = `<div class="gage"><h3>Égalité parfaite 🤝</h3>
      <p>Vous vous connaissez autant l'un que l'autre. Un bisou pour fêter ça ! 😘</p></div>`;
  }

  app.innerHTML = `
    <div class="card result">
      <h2>Votre Love-o-mètre</h2>
      <div class="meter-wrap">
        <svg viewBox="0 0 120 120" width="200" height="200">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#eee3f5" stroke-width="12"/>
          <circle id="arc" cx="60" cy="60" r="52" fill="none" stroke="url(#grad)"
            stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${(2*Math.PI*52).toFixed(1)}"
            stroke-dashoffset="${(2*Math.PI*52).toFixed(1)}"
            transform="rotate(-90 60 60)"/>
          <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff6b9d"/><stop offset="100%" stop-color="#9d7bff"/>
          </linearGradient></defs>
        </svg>
        <div class="meter-num"><span class="pct">${pct}%</span><small>de connexion</small></div>
      </div>
      <div class="verdict">${vt}</div>
      <div class="verdict-desc">${vd}</div>

      <div class="score-rows">
        <div class="row"><span>${esc(S.B)} connaît ${esc(S.A)}</span><b>${m1}/${total} · ${pctB}%</b></div>
        <div class="row"><span>${esc(S.A)} connaît ${esc(S.B)}</span><b>${m2}/${total} · ${pctA}%</b></div>
      </div>

      ${gage}

      <button class="btn" id="replay">Rejouer (nouvelles questions 🎲)</button>
      <button class="btn secondary" id="recap">Voir le détail des réponses</button>
      <button class="btn ghost" id="home">Changer les joueurs / réglages</button>
      <div class="seen-line">🎯 ${seenSet.size} / ${QUESTIONS.length} questions jouées
        <button class="reset-link" id="resetR">🔄 Remettre à zéro</button></div>
    </div>
  `;

  // animation de l'arc + confettis
  requestAnimationFrame(() => {
    const arc = document.getElementById("arc");
    const c = 2 * Math.PI * 52;
    arc.style.transition = "stroke-dashoffset 1.1s ease";
    arc.style.strokeDashoffset = (c * (1 - pct / 100)).toFixed(1);
  });
  if (pct >= 55) heartsRain();

  document.getElementById("replay").onclick = () => {
    buildDeck(); S.round = 1; S.qi = 0;
    S.truth = { 1: [], 2: [] }; S.guess = { 1: [], 2: [] };
    go("intro");
  };
  document.getElementById("recap").onclick = () => go("recap");
  document.getElementById("home").onclick = () => go("home");
  document.getElementById("resetR").onclick = () => {
    if (confirm("Remettre toutes les questions à zéro ?")) { resetSeen(); go("home"); }
  };
}

/* ---------- Récap détaillé ---------- */
function screenRecap() {
  const block = (round, knower, known) => {
    const rows = S.deck.map((q, i) => {
      const correct = S.truth[round][i];
      const guessed = S.guess[round][i];
      const ok = correct === guessed;
      return `<div class="recap-item">
        <div class="rq">${esc(q.q)}</div>
        <div class="ra">Réponse de ${esc(known)} : <b>${esc(q.o[correct])}</b></div>
        <div class="ra">Devinette de ${esc(knower)} : ${ok
          ? `<span class="ok">${esc(q.o[guessed])} ✓</span>`
          : `<span class="ko">${esc(q.o[guessed])} ✗</span>`}</div>
      </div>`;
    }).join("");
    return `<h2 style="margin-top:18px">${esc(knower)} → ${esc(known)}</h2>${rows}`;
  };

  app.innerHTML = `
    <div class="card">
      <h2>Le détail 🔍</h2>
      <p class="sub">Qui a deviné quoi.</p>
      <div class="recap">
        ${block(1, S.B, S.A)}
        ${block(2, S.A, S.B)}
      </div>
      <button class="btn" id="back">← Retour aux résultats</button>
    </div>
  `;
  document.getElementById("back").onclick = () => go("results");
}

/* ---------- Pluie de cœurs ---------- */
function heartsRain() {
  const hearts = ["💖", "💕", "💗", "💓", "❤️", "💘", "✨"];
  for (let i = 0; i < 28; i++) {
    const h = document.createElement("div");
    h.className = "confetti";
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    h.style.left = Math.random() * 100 + "vw";
    h.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
    h.style.animationDelay = Math.random() * 0.8 + "s";
    h.style.fontSize = 1 + Math.random() * 1.6 + "rem";
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 5500);
  }
}

/* ---------- Échappement HTML (sécurité des prénoms) ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[m]);
}

/* ---------- Démarrage ---------- */
render();

/* ---------- Service worker (mode hors-ligne, si hébergé) ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
