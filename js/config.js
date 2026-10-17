/* =========================================================================
   App settings — edit these.

   FIREBASE: paste the config object from
   Firebase console → Project settings → General → Your apps → Web app.
   While FIREBASE_CONFIG is null the app runs in DEMO MODE: everything is
   stored only in this browser (handy for trying it out).
   ========================================================================= */
window.NIP = window.NIP || {};

NIP.CONFIG = {
  CLUB_NAME: 'Surf Life Saving Club',      // e.g. 'Woolgoolga SLSC'
  APP_NAME: 'Nipper Hub',

  // Firebase project: nippers-slsc-organisation
  // (A web config like this is designed to be public; Firestore security
  //  rules in firestore.rules are what protect the data.)
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCMcLI0a8XTMDQu4ISU4088FI1fllMJiOc",
    authDomain: "nippers-slsc-organisation.firebaseapp.com",
    projectId: "nippers-slsc-organisation",
    storageBucket: "nippers-slsc-organisation.firebasestorage.app",
    messagingSenderId: "703392103641",
    appId: "1:703392103641:web:d829b49339cefc8799d2c8"
  }
};
// Tip: add ?demo to the URL (e.g. index.html?demo) to try the app with
// local-only demo data instead of Firebase.
