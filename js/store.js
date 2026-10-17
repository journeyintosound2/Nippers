/* =========================================================================
   Data layer. Two interchangeable back-ends:
   - FirebaseStore: Firebase Auth + Cloud Firestore (the real club data)
   - DemoStore:     sample data kept in this browser only ("Try demo mode")

   CLUB CODE
   Everyone signs in with the same club code. Under the hood that's one
   Firebase Auth account (club@<authDomain>) whose password is made from the
   code. The code itself is never stored in this repo. The Firestore rules
   only let that one account read/write, so everyone who signs in with the
   code shares (and saves to) the same data. Free Spark plan, no Cloud Functions.
   ========================================================================= */
window.NIP = window.NIP || {};

(function () {
  const FB_VER = '10.12.2';

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
  function err(msg, code) { const e = new Error(msg); e.code = code; return e; }

  /* =======================================================================
     DEMO STORE — sample data, this browser only, never touches Firebase
     ======================================================================= */
  function DemoStore() {
    const KEY = 'nipperhub-demo-v3';
    const blank = () => ({ participants: {}, sessions: {} });
    let db = blank();
    const subs = { participants: [], sessions: [] };
    try { const raw = localStorage.getItem(KEY); if (raw) db = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
    function emit(col) {
      const list = Object.entries(db[col]).map(([id, d]) => Object.assign({ id }, d));
      subs[col].forEach(cb => cb(list));
    }
    return {
      mode: 'demo',
      async init() { },
      onAuth(cb) { setTimeout(() => cb({ uid: 'demo' }), 0); },
      async signOut() { },
      subscribe(col, cb) {
        if (!subs[col]) subs[col] = [];
        subs[col].push(cb);
        setTimeout(() => emit(col), 0);
        return () => { subs[col] = subs[col].filter(f => f !== cb); };
      },
      async add(col, data) { const id = uid(); db[col][id] = Object.assign({ createdAt: Date.now() }, data); persist(); emit(col); return id; },
      async update(col, id, patch) {
        if (!db[col][id]) db[col][id] = {};
        Object.entries(patch).forEach(([k, v]) => setPath(db[col][id], k, v === NIP.DELETE ? undefined : v));
        persist(); emit(col);
      },
      async remove(col, id) { delete db[col][id]; persist(); emit(col); },
      async batchAdd(col, list) { list.forEach(d => { db[col][uid()] = Object.assign({ createdAt: Date.now() }, d); }); persist(); emit(col); },
      resetDemo() { db = blank(); persist(); emit('participants'); emit('sessions'); }
    };
  }

  /* =======================================================================
     FIREBASE STORE
     ======================================================================= */
  function FirebaseStore(config) {
    let fb = {}, app, auth, fs;
    const CLUB_EMAIL = `club@${config.authDomain}`;
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

    /* Offline-friendly writes: Firestore applies changes locally straight away
       and syncs when there's reception, but its promise waits for the server.
       Wait at most 2.5 s, then carry on; later failures are still reported. */
    function settle(p) {
      let waited = false;
      p.catch(e => { if (waited && NIP.onWriteError) NIP.onWriteError(e); });
      return Promise.race([p, new Promise(r => setTimeout(() => { waited = true; r(); }, 2500))]);
    }

    return {
      mode: 'firebase',
      async init() { await load(); },
      onAuth(cb) { fb.onAuthStateChanged(auth, user => cb(user)); },
      async signInWithCode(code) {
        if (NIP.normaliseCode(code).length < 4) throw err('Enter the club code', 'auth/invalid-credential');
        await fb.signInWithEmailAndPassword(auth, CLUB_EMAIL, passFor(code));
      },
      /* First-time setup: creates the club login and claims the database.
         The Firestore rules only allow the claim while meta/owner is empty. */
      async setupClub(code) {
        let cred;
        try { cred = await fb.createUserWithEmailAndPassword(auth, CLUB_EMAIL, passFor(code)); }
        catch (e) { if (e.code === 'auth/email-already-in-use') throw err('Already set up', 'already-setup'); throw e; }
        try { await fb.setDoc(fb.doc(fs, 'meta', 'owner'), { uid: cred.user.uid, at: Date.now() }); }
        catch (e) {
          try { await fb.deleteUser(cred.user); } catch (x) { await fb.signOut(auth); }
          throw err('Database already claimed', 'already-claimed');
        }
      },
      /* Change the club code. Other phones are signed out (within about an
         hour) and need the new code. */
      async changeCode(oldCode, newCode) {
        const cred = fb.EmailAuthProvider.credential(CLUB_EMAIL, passFor(oldCode));
        await fb.reauthenticateWithCredential(auth.currentUser, cred);
        await fb.updatePassword(auth.currentUser, passFor(newCode));
      },
      async signOut() { await fb.signOut(auth); },
      subscribe(col, cb) {
        return fb.onSnapshot(fb.collection(fs, col),
          snap => cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))),
          e => { console.warn('Subscribe ' + col + ' failed:', e.code); if (NIP.onSubscribeError) NIP.onSubscribeError(e); cb([]); });
      },
      async add(col, data) {
        const ref = fb.doc(fb.collection(fs, col));
        await settle(fb.setDoc(ref, Object.assign({ createdAt: Date.now() }, data)));
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
          list.slice(i, i + 400).forEach(d => batch.set(fb.doc(fb.collection(fs, col)), Object.assign({ createdAt: Date.now() }, d)));
          await settle(batch.commit());
        }
      }
    };
  }

  NIP.DELETE = { __delete: true };
  NIP.isDemoUrl = () => /[?&]demo\b/.test(location.search) || location.protocol === 'file:';
  NIP.createStore = function () {
    const cfg = NIP.CONFIG && NIP.CONFIG.FIREBASE_CONFIG;
    return cfg && cfg.apiKey && !NIP.isDemoUrl() ? FirebaseStore(cfg) : DemoStore();
  };
})();
