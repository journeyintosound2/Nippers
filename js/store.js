/* =========================================================================
   Data layer. Two interchangeable back-ends:
   - FirebaseStore: Firebase Auth + Cloud Firestore
   - DemoStore:     localStorage only (add ?demo to the URL)

   LOGIN CODES
   Staff sign in with a code like "K7QM-4TXA" — no email address needed.
   Under the hood each code is a Firebase Auth account whose email and
   password are derived from the code, so it works on the free Spark plan
   (no Cloud Functions). Admins create codes on the Admin page; switching a
   code to "Deactivated" removes all access straight away (enforced by the
   Firestore rules).
   ========================================================================= */
window.NIP = window.NIP || {};

(function () {
  const FB_VER = '10.12.2';
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

  /* ---------- helpers ---------- */
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {};
      o = o[parts[i]];
    }
    if (value === undefined) delete o[parts[parts.length - 1]];
    else o[parts[parts.length - 1]] = value;
  }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  NIP.normaliseCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  NIP.formatCode = c => { const n = NIP.normaliseCode(c); return n.length === 8 ? n.slice(0, 4) + '-' + n.slice(4) : n; };
  NIP.generateCode = function () {
    const buf = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    return NIP.formatCode(Array.from(buf, n => ALPHABET[n % ALPHABET.length]).join(''));
  };
  function codeError(msg, code) { const e = new Error(msg); e.code = code; return e; }

  /* =======================================================================
     DEMO STORE
     ======================================================================= */
  function DemoStore() {
    const KEY = 'nipperhub-demo-v2';
    const blank = () => ({ participants: {}, sessions: {}, staff: {}, codes: {}, meta: {} });
    let db = blank();
    let user = null;
    const subs = { participants: [], sessions: [], staff: [], codes: [] };
    const authSubs = [];
    try { const raw = localStorage.getItem(KEY); if (raw) db = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
    try { const u = localStorage.getItem(KEY + '-user'); if (u) user = JSON.parse(u); } catch (e) { }

    function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
    function emit(col) {
      const list = Object.entries(db[col]).map(([id, d]) => Object.assign({ id }, d));
      subs[col].forEach(cb => cb(list));
    }
    function emitAuth() { authSubs.forEach(cb => cb(user, user ? db.staff[user.uid] || null : null)); }
    function setUser(u) { user = u; try { u ? localStorage.setItem(KEY + '-user', JSON.stringify(u)) : localStorage.removeItem(KEY + '-user'); } catch (e) { } }

    return {
      mode: 'demo',
      async init() { },
      onAuth(cb) { authSubs.push(cb); setTimeout(() => cb(user, user ? db.staff[user.uid] || null : null), 0); },
      async signInWithCode(code) {
        const n = NIP.normaliseCode(code);
        const hit = Object.entries(db.codes).find(([, c]) => NIP.normaliseCode(c.code) === n);
        if (!hit) throw codeError('Code not recognised', 'auth/invalid-credential');
        setUser({ uid: hit[0] });
        if (db.staff[hit[0]]) db.staff[hit[0]].lastLogin = Date.now();
        persist(); emitAuth(); emit('staff');
      },
      async setupOwner(name) {
        if (db.meta.owner) throw codeError('Already set up', 'already-setup');
        const id = 'demo-' + uid(); const code = NIP.generateCode();
        db.meta.owner = { uid: id };
        db.staff[id] = { name, role: 'admin', createdAt: Date.now(), lastLogin: Date.now() };
        db.codes[id] = { code, name, createdAt: Date.now() };
        persist(); setUser({ uid: id }); emitAuth();
        return code;
      },
      async createCode(name, role) {
        const id = 'demo-' + uid(); const code = NIP.generateCode();
        db.staff[id] = { name, role, createdAt: Date.now() };
        db.codes[id] = { code, name, createdAt: Date.now() };
        persist(); emit('staff'); emit('codes');
        return { uid: id, code };
      },
      async signOut() { setUser(null); emitAuth(); },
      subscribe(col, cb) {
        subs[col].push(cb);
        setTimeout(() => emit(col), 0);
        return () => { subs[col] = subs[col].filter(f => f !== cb); };
      },
      async add(col, data) { const id = uid(); db[col][id] = Object.assign({ createdAt: Date.now() }, data); persist(); emit(col); return id; },
      async update(col, id, patch) {
        if (!db[col][id]) db[col][id] = {};
        Object.entries(patch).forEach(([k, v]) => setPath(db[col][id], k, v === NIP.DELETE ? undefined : v));
        persist(); emit(col); if (col === 'staff') emitAuth();
      },
      async remove(col, id) { delete db[col][id]; persist(); emit(col); if (col === 'staff') emitAuth(); },
      async batchAdd(col, list) { list.forEach(d => { db[col][uid()] = Object.assign({ createdAt: Date.now() }, d); }); persist(); emit(col); },
      resetDemo() { db = blank(); setUser(null); persist(); emitAuth(); }
    };
  }

  /* =======================================================================
     FIREBASE STORE
     ======================================================================= */
  function FirebaseStore(config) {
    let fb = {}, app, auth, fs, currentUser = null;
    let staffUnsub = null;
    const domain = config.authDomain;
    const emailFor = code => `code-${NIP.normaliseCode(code).toLowerCase()}@${domain}`;
    const passFor = code => `nh-${NIP.normaliseCode(code)}`;

    async function load() {
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      const [appMod, authMod, fsMod] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]);
      fb = Object.assign({}, appMod, authMod, fsMod);
      app = fb.initializeApp(config);
      auth = fb.getAuth(app);
      fs = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
    }

    function toFs(v) { return v === NIP.DELETE ? fb.deleteField() : v; }

    /* Offline-friendly writes. Firestore applies a change to the local cache
       instantly and syncs when there's reception, but its promise only
       resolves once the server confirms. So we wait at most 2.5 s, then carry
       on; a later failure (e.g. permissions) is still reported. */
    function settle(p) {
      let waited = false;
      p.catch(e => { if (waited && NIP.onWriteError) NIP.onWriteError(e); });
      return Promise.race([p, new Promise(r => setTimeout(() => { waited = true; r(); }, 2500))]);
    }

    return {
      mode: 'firebase',
      async init() { await load(); },
      onAuth(cb) {
        fb.onAuthStateChanged(auth, user => {
          currentUser = user;
          if (staffUnsub) { staffUnsub(); staffUnsub = null; }
          if (!user) { cb(null, null); return; }
          staffUnsub = fb.onSnapshot(fb.doc(fs, 'staff', user.uid),
            s => cb(user, s.exists() ? s.data() : null),
            err => { console.error(err); cb(user, null); });
        });
      },
      async signInWithCode(code) {
        if (NIP.normaliseCode(code).length !== 8) throw codeError('Codes are 8 characters', 'auth/invalid-credential');
        const cred = await fb.signInWithEmailAndPassword(auth, emailFor(code), passFor(code));
        try { await fb.updateDoc(fb.doc(fs, 'staff', cred.user.uid), { lastLogin: Date.now() }); } catch (e) { /* deactivated or missing — UI handles */ }
      },
      /* First-time setup: creates the first admin code and claims the club.
         The Firestore rules only allow this while meta/owner doesn't exist. */
      async setupOwner(name) {
        const code = NIP.generateCode();
        const cred = await fb.createUserWithEmailAndPassword(auth, emailFor(code), passFor(code));
        const id = cred.user.uid;
        const batch = fb.writeBatch(fs);
        batch.set(fb.doc(fs, 'meta', 'owner'), { uid: id, at: Date.now() });
        batch.set(fb.doc(fs, 'staff', id), { name, role: 'admin', createdAt: Date.now(), lastLogin: Date.now() });
        batch.set(fb.doc(fs, 'codes', id), { code, name, createdAt: Date.now() });
        try { await batch.commit(); }
        catch (e) {
          try { await fb.deleteUser(cred.user); } catch (x) { await fb.signOut(auth); }
          throw codeError('Nipper Hub is already set up', 'already-setup');
        }
        return code;
      },
      /* Admin creates a code for someone else. A temporary second Firebase
         app makes the account so the admin stays signed in. */
      async createCode(name, role) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const code = NIP.generateCode();
          const sec = fb.initializeApp(config, 'creator-' + Date.now() + attempt);
          const secAuth = fb.initializeAuth(sec, { persistence: fb.inMemoryPersistence });
          let newUid;
          try {
            const cred = await fb.createUserWithEmailAndPassword(secAuth, emailFor(code), passFor(code));
            newUid = cred.user.uid;
          } catch (e) {
            await fb.deleteApp(sec);
            if (e.code === 'auth/email-already-in-use') continue; // astronomically rare: try another code
            throw e;
          }
          try { await fb.signOut(secAuth); } catch (e) { }
          await fb.deleteApp(sec);
          const batch = fb.writeBatch(fs);
          batch.set(fb.doc(fs, 'staff', newUid), { name, role, createdAt: Date.now(), createdBy: currentUser && currentUser.uid });
          batch.set(fb.doc(fs, 'codes', newUid), { code, name, createdAt: Date.now() });
          await batch.commit();
          return { uid: newUid, code };
        }
        throw new Error('Could not create a unique code, try again');
      },
      async signOut() { await fb.signOut(auth); },
      subscribe(col, cb) {
        return fb.onSnapshot(fb.collection(fs, col),
          snap => cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))),
          err => { console.warn('Subscribe ' + col + ' failed:', err.code); cb([]); });
      },
      async add(col, data) {
        const ref = fb.doc(fb.collection(fs, col));
        await settle(fb.setDoc(ref, Object.assign({ createdAt: Date.now(), createdBy: currentUser && currentUser.uid }, data)));
        return ref.id;
      },
      async update(col, id, patch) {
        const p = {};
        Object.entries(patch).forEach(([k, v]) => { p[k] = toFs(v); });
        await settle(fb.updateDoc(fb.doc(fs, col, id), p));
      },
      async remove(col, id) { await settle(fb.deleteDoc(fb.doc(fs, col, id))); },
      async batchAdd(col, list) {
        for (let i = 0; i < list.length; i += 400) {
          const batch = fb.writeBatch(fs);
          list.slice(i, i + 400).forEach(d => batch.set(fb.doc(fb.collection(fs, col)), Object.assign({ createdAt: Date.now(), createdBy: currentUser && currentUser.uid }, d)));
          await settle(batch.commit());
        }
      }
    };
  }

  NIP.DELETE = { __delete: true };
  NIP.createStore = function () {
    const cfg = NIP.CONFIG && NIP.CONFIG.FIREBASE_CONFIG;
    const forceDemo = /[?&]demo\b/.test(location.search) || location.protocol === 'file:';
    return cfg && cfg.apiKey && !forceDemo ? FirebaseStore(cfg) : DemoStore();
  };
})();
