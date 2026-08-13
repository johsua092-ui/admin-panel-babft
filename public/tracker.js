/* =========================================================================
 * BABFT User Tracker — untuk dipasang di website kamu (Firebase punya-si-jawa).
 *
 * Setiap user yang login / browsing otomatis tercatat ke koleksi `users`
 * di Firestore, lalu terbaca live oleh admin panel.
 *
 * Yang dicatat: email, displayName, photoURL, region/negara, countryCode,
 * timezone, IP, firstLoginAt, lastLoginAt, lastOnlineAt, online, dan flag
 * VPN (region berubah antar negara = dicurigai VPN).
 *
 * IMPORT (ESM) di file kamu:
 *   import { getAuth, onAuthStateChanged } from "firebase/auth";
 *   import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
 *
 * INIT:
 *   BABFT_Tracker.init({
 *     auth: getAuth(app),
 *     db: getFirestore(app),
 *     onAuthStateChanged,
 *     doc, getDoc, setDoc,
 *   });
 * ========================================================================= */

const GEO_URLS = ["https://ipwho.is/", "https://ipapi.co/json/"];

async function fetchGeo(retries = 2) {
  for (let i = 0; i < retries; i++) {
    for (const url of GEO_URLS) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const j = await r.json();
        if (j.country || j.country_code || j.ip) {
          return {
            region: j.country || j.country_name || null,
            countryCode: j.country_code || null,
            timezone: j.timezone || null,
            ip: j.ip || null,
          };
        }
      } catch (_) {}
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return { region: null, countryCode: null, timezone: null, ip: null };
}

async function traceUser(ctx, user) {
  const { db, doc, getDoc, setDoc } = ctx;
  const ref = doc(db, "users", user.uid);
  const now = Date.now();

  let prev = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) prev = snap.data();
  } catch (_) {}

  const geo = ctx.geoOverride || (await fetchGeo());

  let flagged = (prev && prev.flaggedAsVpn) || false;
  let changeCount = (prev && prev.regionChangeCount) || 0;
  if (prev && prev.region && geo.region && prev.region !== geo.region) {
    flagged = true;
    changeCount += 1;
  }

  const payload = {
    uid: user.uid,
    email: user.email || (prev && prev.email) || null,
    displayName: user.displayName || (prev && prev.displayName) || null,
    photoURL: user.photoURL || (prev && prev.photoURL) || null,
    online: true,
    lastOnlineAt: now,
    lastLoginAt: now,
    firstLoginAt: (prev && prev.firstLoginAt) || now,
    loginCount: ((prev && prev.loginCount) || 0) + 1,
    region: geo.region || (prev && prev.region) || null,
    countryCode: geo.countryCode || (prev && prev.countryCode) || null,
    timezone: geo.timezone || (prev && prev.timezone) || null,
    ipAddress: geo.ip || (prev && prev.ipAddress) || null,
    previousRegion: (prev && prev.region) || null,
    regionChangeCount: changeCount,
    flaggedAsVpn: flagged,
    updatedAt: now,
    createdAt: (prev && prev.createdAt) || now,
  };

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (e) {
    console.warn("[BABFT Tracker] gagal tulis user", user.uid, e && e.message);
  }
}

export function init(opts) {
  if (!opts || !opts.auth || !opts.db || !opts.onAuthStateChanged || !opts.doc || !opts.setDoc) {
    console.warn("[BABFT Tracker] init butuh { auth, db, onAuthStateChanged, doc, getDoc, setDoc }");
    return;
  }
  const ctx = {
    db: opts.db,
    doc: opts.doc,
    getDoc: opts.getDoc,
    setDoc: opts.setDoc,
    onAuthStateChanged: opts.onAuthStateChanged,
    geoOverride: opts.geoOverride || null,
  };

  ctx.onAuthStateChanged(opts.auth, (user) => {
    if (user) traceUser(ctx, user);
  });

  // heartbeat: perbarui status online tiap 30 detik selama halaman terbuka.
  setInterval(() => {
    const u = opts.auth.currentUser;
    if (u) traceUser(ctx, u);
  }, 30000);
}

export { fetchGeo };
