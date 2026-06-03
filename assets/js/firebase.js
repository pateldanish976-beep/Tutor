// Firebase helpers (optional integration). If window.firebaseConfig is not replaced, the helpers are no-ops and the app falls back to localStorage.
// Uses Firebase v9 modular SDK via CDN.
const FirebaseHelpers = (function(){
  let app = null; let auth = null; let db = null; let storage = null; let enabled = false;

  async function init(){
    if(!window.firebaseConfig || !window.firebaseConfig.projectId || window.firebaseConfig.projectId === 'YOUR_PROJECT_ID'){
      console.warn('Firebase config not provided or placeholders detected — running in local (no-backend) mode.');
      enabled = false;
      return;
    }
    try{
      // load modular SDKs
      const [{ initializeApp }, { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }, { getFirestore, collection, doc, setDoc, addDoc, getDocs, query, orderBy, limit, where }, { getStorage, ref, uploadBytes, getDownloadURL }]
        = await Promise.all([
          import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'),
          import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'),
          import('https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js')
        ]);
      app = initializeApp(window.firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      enabled = true;
      console.log('Firebase initialized.');
    }catch(err){
      console.error('Failed to initialize Firebase:', err);
      enabled = false;
    }
  }

  function isEnabled(){ return enabled; }

  // Auth helpers
  function onAuth(cb){ if(!enabled) return; return onAuthStateChanged(auth, cb); }

  async function signIn(email, password){
    if(!enabled) throw new Error('Firebase not enabled');
    return signInWithEmailAndPassword(auth, email, password);
  }
  async function signUp(email, password, displayName='', role='student'){
    if(!enabled) throw new Error('Firebase not enabled');
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    // save profile with role
    await setDoc(doc(db, 'users', uid), { email, displayName, role, createdAt: new Date().toISOString() });
    return userCred;
  }
  async function signOutUser(){ if(!enabled) throw new Error('Firebase not enabled'); return signOut(auth); }

  // Firestore helpers
  async function saveTestResult(uid, result){
    if(!enabled) throw new Error('Firebase not enabled');
    // result: { date, total, score, percent, subject }
    await addDoc(collection(db, 'results'), Object.assign({ uid }, result));
    // also save to users/{uid}/results
    await addDoc(collection(db, 'users', uid, 'results'), result);
  }

  async function saveTutorApplication(app){
    if(!enabled) throw new Error('Firebase not enabled');
    // app: { name, email, subject, bio, resumeFile }
    const payload = { name: app.name, email: app.email, subject: app.subject, bio: app.bio, date: new Date().toISOString(), resumeUrl: '' };
    const docRef = await addDoc(collection(db, 'applications'), payload);
    if(app.resumeFile && app.resumeFile instanceof File){
      const storagePath = `applications/${docRef.id}/${app.resumeFile.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, app.resumeFile);
      const url = await getDownloadURL(storageRef);
      // update doc with resume url
      await setDoc(doc(db, 'applications', docRef.id), Object.assign(payload, { resumeUrl: url }));
    }
  }

  async function listRecentResults(limitN=50){
    if(!enabled) throw new Error('Firebase not enabled');
    const q = query(collection(db, 'results'), orderBy('date','desc'), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map(d=> ({ id: d.id, ...d.data() }));
  }

  async function listApplications(limitN=50){
    if(!enabled) throw new Error('Firebase not enabled');
    const q = query(collection(db, 'applications'), orderBy('date','desc'), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map(d=> ({ id: d.id, ...d.data() }));
  }

  function isAdminUid(uid){
    if(window.easygradeAdmins && Array.isArray(window.easygradeAdmins)){
      return window.easygradeAdmins.includes(uid);
    }
    return false;
  }

  return {
    init, isEnabled, onAuth, signIn, signUp, signOutUser, saveTestResult, saveTutorApplication, listRecentResults, listApplications, isAdminUid
  };
})();

// Initialize on load but don't block
FirebaseHelpers.init();
