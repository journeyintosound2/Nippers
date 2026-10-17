# Nipper Hub

A web app for Nippers age managers and the Junior Activities Chair. It does four things:

- **Sign-offs.** Records each nipper's **Preliminary Evaluation** (flotation, submersion and propulsion, set for their age group) and **Competition Evaluation**, ticked off on the beach or poolside.
- **Sessions.** A weekly attendance register and games plan. Attendance feeds the age-award (Surf Education) recommendation.
- **Games library.** 23 beach games and activities, each with set-up, rules, safety notes and variations. You can filter by age group and type.
- **Water safety.** A ratio calculator based on the Surf Risk Rating, plus a tracker for Nipper Safety Assistants' skills maintenance.

It runs on Firebase (Authentication + Cloud Firestore) using the project **nippers-slsc-organisation**. There's no build step: it's plain HTML, CSS and JS.

> **Official records.** Nipper Hub is a working tool for the beach. Evaluations and awards still need to be entered in your club's official system (SLS Hub / Nipper App / SurfGuard) to count for competition entries and age awards. Use **Nippers → Export CSV** to help with that.

---

## 1. One-time Firebase setup (≈10 minutes)

In the [Firebase console](https://console.firebase.google.com/), open **nippers-slsc-organisation**.

1. **Turn on email sign-in.** Go to Build → **Authentication** → Get started → Sign-in method → **Email/Password** → Enable → Save.
2. **Create the database.** Go to Build → **Firestore Database** → Create database. Choose location **australia-southeast1 (Sydney)** and start in **production mode**.
3. **Paste the security rules.** In Firestore → **Rules**, replace everything with the contents of `firestore.rules` in this folder, then click **Publish**.
   These rules mean only approved age managers can see nipper data.
4. **Authorise your web address.** Go to Authentication → Settings → **Authorised domains** and add wherever you host it, e.g. `yourname.github.io`. `localhost` is already there.

The Firebase web config is already in `js/config.js`. That key is designed to be public; the security rules are what protect the data.

## 2. Put it online

**Option A: GitHub Pages** (like your other projects)
1. Push this folder to a GitHub repo.
2. In the repo, go to Settings → Pages → Deploy from branch → `main` / root.
3. Add `<username>.github.io` to Firebase's Authorised domains (step 4 above).

**Option B: Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase deploy          # deploys the site AND the firestore.rules
```
Your app will be at `https://nippers-slsc-organisation.web.app`.

**Testing on your Mac:** run `python3 -m http.server 8000` in this folder, then open http://localhost:8000.

## 3. Claim the club, then invite age managers

1. Open the app and **create an account first**. The first account becomes the club **admin**, so do this before you share the link.
2. Age managers then create their own accounts. They'll see "waiting for approval".
3. Approve them in **More → Team** by setting them to *Age manager*, or *Admin* for other committee members.

## 4. Season workflow

| When | What |
|---|---|
| Pre-season | **Nippers → Paste a list** from your registration export (`First Last, DD/MM/YYYY, new`). Add a DOB and the age group is worked out automatically (age at 30 September). |
| Evaluation day | **Sign-off** → pick the age group → tap each element as the nipper completes it. Once every element is ticked, the nipper is signed off automatically with your name and the date. Use **Not yet** if they don't meet the standard. |
| Each week | **Sessions → New session** → tick attendance, add games, enter the Surf Risk Rating. The session warns you if a nipper who hasn't passed their prelim is present for a water activity. |
| End of season | Open each nipper → **Recommend for award** (SLS NSW suggests at least 50% attendance). Then **Export CSV**. |
| Next season | Change the season selector in the header. Age groups roll forward automatically and last season's results stay on each nipper's page. |

## Try it without Firebase

Add `?demo` to the address, e.g. `http://localhost:8000/?demo`. Data in demo mode stays only in that browser, and **More → Load sample nippers** fills in a test roster. Opening `index.html` straight from Finder also runs in demo mode.

## Editing content

- `js/standards.js` holds the evaluation requirements per age group. Edit it if your branch sets higher standards (clubs can go above the state standard, never below).
- `js/games.js` holds the games library. Copy an existing entry to add your own.
- `js/config.js` holds the club name, app name and Firebase config.

## Privacy

The app stores only what's needed to run nippers: name, optional DOB, age group, evaluation results and attendance. **Don't store medical, contact or custody information here.** Those belong in SLS Hub. Only approved staff can read the data, and admins can delete a nipper's record entirely.

## Sources for the sign-off standards

- SLS NSW Junior Activities Manual: [Preliminary Evaluations](https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/preliminary-evaluations), [Competition Evaluation](https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/junior-competition-evaluation), [Junior Age Awards](https://www.manula.com/manuals/slsnsw/junior-activities/1/en/topic/junior-age-awards)
- SLSA Procedure 1.01A Water Safety Procedure (May 2026)
- SLSA Procedure 1.01B Nipper Safety Assistant Award (May 2026)
