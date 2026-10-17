/* =========================================================================
   Data layer. Two interchangeable back-ends:
   - FirebaseStore: Firebase Auth (email/password) + Cloud Firestore
   - DemoStore:     localStorage only (used when FIREBASE_CONFIG is null)
   Both expose the same API so the UI doesn't care which is in use.
   ========================================================================= */
window.NIP = window.NIP || {};

(function () {
  const COLLECTIONS = ['participants', 'sessions', 'staff'];
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

  /* =======================================================================
     DEMO STORE
     ======================================================================= */
  function DemoStore() {
    const KEY = 'nipperhub-demo-v1';
    let db = { participants: {}, sessions: {}, staff: {} };
    let user = null;
    const subs = { participants: [], sessions: [], staff: [] };
    const authSubs = [];
    try { const raw = localStorage.getItem(KEY); if (raw) db = Object.assign(db, JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
    try { const u = localStorage.getItem(KEY + '-user'); if (u) user = JSON.parse(u); } catch (e) { }

    function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
    function emit(col) {
      const list = Object.entries(db[col]).map(([id, d]) => Object.assign({ id }, d));
      subs[col].forEach(cb => cb(list));
    }
    function emitAuth() { authSubs.forEach(cb => cb(user, user ? db.staff[user.uid] : null)); }

    return {
      mode: 'demo',
      async init() { },
      onAuth(cb) { authSubs.push(cb); setTimeout(() => cb(user, user ? db.staff[user.uid] : null), 0); },
      async signIn(email, password, name) {
        if (!email) throw new Error('Enter any email to try the demo.');
        user = { uid: 'demo-' + email.toLowerCase().replace(/[^a-z0-9]/g, ''), email };
        if (!db.staff[user.uid]) db.staff[user.uid] = { name: name || email.split('@')[0], email, role: 'admin', createdAt: Date.now() };
        persist();
        try { localStorage.setItem(KEY + '-user', JSON.stringify(user)); } catch (e) { }
        emitAuth(); emit('staff');
      },
      async signUp(name, email, password) { return this.signIn(email, password, name); },
      async resetPassword() { throw new Error('Password reset is not available in demo mode.'); },
      async signOut() { user = null; try { localStorage.removeItem(KEY + '-user'); } catch (e) { } emitAuth(); },
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
      async remove(col, id) { delete db[col][id]; persist(); emit(col); },
      async batchAdd(col, list) { list.forEach(d => { db[col][uid()] = Object.assign({ createdAt: Date.now() }, d); }); persist(); emit(col); },
      resetDemo() { db = { participants: {}, sessions: {}, staff: user ? { [user.uid]: db.staff[user.uid] } : {} }; persist(); COLLECTIONS.forEach(emit); }
    };
  }

  /* =======================================================================
     FIREBASE STORE
     ======================================================================= */
  function FirebaseStore(config) {
    let fb = {}, app, auth, fs, currentUser = null;
    const authSubs = [];
    let staffUnsub = null;

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

    /* First person to sign in claims the club (becomes admin). Everyone
       after that is 'pending' until an admin approves them. */
    async function ensureStaffDoc(user, name) {
      const ref = fb.doc(fs, 'staff', user.uid);
      const snap = await fb.getDoc(ref);
      if (snap.exists()) return;
      const ownerRef = fb.doc(fs, 'meta', 'owner');
      const owner = await fb.getDoc(ownerRef);
      const profile = { name: name || user.displayName || user.email.split('@')[0], email: user.email, createdAt: Date.now() };
      if (!owner.exists()) {
        const batch = fb.writeBatch(fs);
        batch.set(ownerRef, { uid: user.uid, email: user.email, at: Date.now() });
        batch.set(ref, Object.assign(profile, { role: 'admin' }));
        try { await batch.commit(); return; } catch (e) { console.warn('Owner claim failed, registering as pending', e); }
      }
      await fb.setDoc(ref, Object.assign(profile, { role: 'pending' }));
    }

    function toFs(v) { return v === NIP.DELETE ? fb.deleteField() : v; }

    return {
      mode: 'firebase',
      async init() { await load(); },
      onAuth(cb) {
        authSubs.push(cb);
        fb.onAuthStateChanged(auth, async user => {
          currentUser = user;
          if (staffUnsub) { staffUnsub(); staffUnsub = null; }
          if (!user) { cb(null, null); return; }
          try { await ensureStaffDoc(user, NIP._pendingName); } catch (e) { console.error(e); }
          staffUnsub = fb.onSnapshot(fb.doc(fs, 'staff', user.uid),
            s => cb(user, s.exists() ? s.data() : null),
            err => { console.error(err); cb(user, null); });
        });
      },
      async signIn(email, password) { await fb.signInWithEmailAndPassword(auth, email, password); },
      async signUp(name, email, password) {
        NIP._pendingName = name;
        const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
        if (name) { try { await fb.updateProfile(cred.user, { displayName: name }); } catch (e) { } }
      },
      async resetPassword(email) { await fb.sendPasswordResetEmail(auth, email); },
      async signOut() { await fb.signOut(auth); },
      subscribe(col, cb) {
        return fb.onSnapshot(fb.collection(fs, col),
          snap => cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))),
          err => { console.warn('Subscribe ' + col + ' failed:', err.code); cb([]); });
      },
      async add(col, data) {
        const r = await fb.addDoc(fb.collection(fs, col), Object.assign({ createdAt: Date.now(), createdBy: currentUser && currentUser.uid }, data));
        return r.id;
      },
      async update(col, id, patch) {
        const p = {};
        Object.entries(patch).forEach(([k, v]) => { p[k] = toFs(v); });
        await fb.updateDoc(fb.doc(fs, col, id), p);
      },
      async remove(col, id) { await fb.deleteDoc(fb.doc(fs, col, id)); },
      async batchAdd(col, list) {
        for (let i = 0; i < list.length; i += 400) {
          const batch = fb.writeBatch(fs);
          list.slice(i, i + 400).forEach(d => batch.set(fb.doc(fb.collection(fs, col)), Object.assign({ createdAt: Date.now(), createdBy: currentUser && currentUser.uid }, d)));
          await batch.commit();
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
