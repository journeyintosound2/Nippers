/* =========================================================================
   Sign-off standards
   Sources:
   - SLS NSW Junior Activities Manual: "Preliminary Evaluations" and
     "Junior Competition Evaluation" (manula.com/manuals/slsnsw/junior-activities)
   - SLSA Procedure 1.01A Water Safety Procedure (May 2026)
   - SLSA Procedure 1.01B Nipper Safety Assistant Award (May 2026)
   Edit this file if your club or branch sets requirements ABOVE the
   state standard (clubs can go above, never below).
   ========================================================================= */
window.NIP = window.NIP || {};

NIP.AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14'];

NIP.AGE_AWARDS = {
  U6: 'Surf Play 1', U7: 'Surf Play 2',
  U8: 'Surf Aware 1', U9: 'Surf Aware 2',
  U10: 'Surf Safe 1', U11: 'Surf Safe 2',
  U12: 'Surf Smart 1', U13: 'Surf Smart 2',
  U14: 'Surf Rescue Certificate (SRC)'
};

NIP.STAGES = {
  1: { name: 'Stage One', focus: 'Aquatic play and fundamental aquatic skills', depth: '1 m', groups: ['U6', 'U7', 'U8'] },
  2: { name: 'Stage Two', focus: 'Applied aquatic skills', depth: '1.5 m', groups: ['U9', 'U10', 'U11'] },
  3: { name: 'Stage Three', focus: 'Junior / trainee lifesaver, pathway to SRC', depth: '1.8 m', groups: ['U12', 'U13', 'U14'] }
};

NIP.stageOf = function (ag) {
  for (const k in NIP.STAGES) if (NIP.STAGES[k].groups.includes(ag)) return Number(k);
  return null;
};

/* Each element is one tick-box in the sign-off. Grouped by area. */
function stage1(floatSecs, propulsion) {
  return [
    { id: 'float', area: 'Flotation', text: `Back or front float for at least ${floatSecs} seconds, then recover to standing` },
    { id: 'submerge', area: 'Submersion', text: 'Submerge and touch the bottom with hands' },
    ...propulsion
  ];
}
function stage2or3(opts) {
  return [
    { id: 'float', area: 'Flotation', text: 'Float front-to-back or back-to-front — 5 seconds each way' },
    { id: 'tread', area: 'Flotation', text: `Tread water and/or scull for at least ${opts.tread}` },
    { id: 'submerge', area: 'Submersion', text: opts.submerge },
    { id: 'swim', area: 'Propulsion', text: `Swim on front, any stroke — ${opts.swim}` },
    { id: 'survival', area: 'Propulsion', text: `Then survival strokes (${opts.strokes}) — at least ${opts.survival}` }
  ];
}
const SUB_TOUCH = 'Submerge and touch the bottom with hands';
const SUB_ROLL = 'Forward or backward roll/somersault underwater, recover to the surface, then submerge and touch the bottom with hands';
const SUB_ROLL_U14 = 'Forward or backward roll/somersault underwater and, without returning to the surface, touch the bottom with hands';
const S2_STROKES = 'breaststroke, sidestroke and/or back sculling';
const S3_STROKES = 'breaststroke and/or sidestroke';

NIP.PRELIM = {
  U6: stage1(5, [{ id: 'glide', area: 'Propulsion', text: 'From a standing start in waist-deep water, front glide 1–2 m and recover to standing' }]),
  U7: stage1(10, [{ id: 'glide', area: 'Propulsion', text: 'From a standing start in waist-deep water, front glide 2–3 m and recover to standing' }]),
  U8: stage1(15, [
    { id: 'swim', area: 'Propulsion', text: 'Swim on front, any stroke — 20 m' },
    { id: 'underwater', area: 'Propulsion', text: 'Then swim underwater for 2–3 m' }
  ]),
  U9: stage2or3({ tread: '1 minute', submerge: SUB_TOUCH, swim: '25 m', strokes: S2_STROKES, survival: '10 m' }),
  U10: stage2or3({ tread: '1 minute', submerge: SUB_TOUCH, swim: '25 m', strokes: S2_STROKES, survival: '25 m' }),
  U11: stage2or3({ tread: '2 minutes', submerge: SUB_ROLL, swim: '25 m', strokes: S2_STROKES, survival: '50 m' }),
  U12: stage2or3({ tread: '3 minutes', submerge: SUB_ROLL, swim: '75 m', strokes: S3_STROKES, survival: '50 m' }),
  U13: stage2or3({ tread: '3 minutes', submerge: SUB_ROLL, swim: '100 m', strokes: S3_STROKES, survival: '50 m' }),
  U14: stage2or3({ tread: '3 minutes', submerge: SUB_ROLL_U14, swim: '100 m', strokes: S3_STROKES, survival: '100 m' })
};

/* Competition evaluation — only needed if the nipper will compete. */
NIP.COMP = {
  U6: null, U7: null,
  U8: null, // no water competition except the wade (waist-deep)
  U9: { id: 'ows', area: 'Open water', text: 'Minimum 150 m open water swim (any recognised stroke)' },
  U10: { id: 'ows', area: 'Open water', text: 'Minimum 150 m open water swim (any recognised stroke)' },
  U11: { id: 'ows', area: 'Open water', text: 'Minimum 200 m open water swim (any recognised stroke)' },
  U12: { id: 'ows', area: 'Open water', text: 'Minimum 200 m open water swim (any recognised stroke)' },
  U13: { id: 'ows', area: 'Open water', text: 'Minimum 200 m open water swim (any recognised stroke)' },
  U14: { id: 'ows', area: 'Open water', text: 'Minimum 200 m open water swim (any recognised stroke)' }
};

/* Nipper Safety Assistant — annual skills maintenance (SLSA 1.01B, s4) */
NIP.NSA = [
  { id: 'swim50', area: 'Swim', text: '50 m swim using a continuous stroke, starting from waist-deep water' },
  { id: 'tread2', area: 'Survival', text: 'Tread water for 2 minutes' },
  { id: 'tube', area: 'Rescue', text: 'Aquatic rescue with a rescue tube (conscious tube rescue only)' },
  { id: 'signals', area: 'Signals', text: 'Knowledge of signals — beach-to-water and water-to-beach' }
];
NIP.NSA_PREREQS = [
  { id: 'member', text: 'Current financial club member' },
  { id: 'age13', text: 'Aged 13 or older' },
  { id: 'wwcc', text: 'Holds the relevant Working With Children Check (NSW)' }
];

/* Reference text shown in the Standards page */
NIP.REF = {
  prelimAssessor: [
    'At least 2 years’ experience as an Age Manager',
    'At least 18 years old',
    'Holds a proficient Surf Rescue Certificate or proficient Bronze Medallion',
    'Approved by the club and noted (minuted) at a club meeting',
    'Or, where an SLS member can’t do it: a qualified, accredited Australian swimming coach using the evaluation template'
  ],
  prelimRatios: [
    'New junior members: 1:1 (water safety : participant) during the evaluation',
    'Returning members of known ability: up to 1:5 (maximum ratio during evaluations)',
    'After evaluation, competent nippers: 1:5 for water activities',
    'Still water / pool, or low-risk conditions after a risk assessment: up to 1:10',
    'Not yet competent: closer supervision, at the club’s discretion'
  ],
  nsaConditions: [
    'Deemed suitable by the Water Safety Supervisor',
    'Low-risk conditions confirmed by risk assessment (Surf Risk Rating 1–8)',
    'Age group is U8 or below',
    'Shallow-water activities only',
    'All NSAs in the water; NSAs no more than 50% of the water safety team; max 1 NSA : 5 participants'
  ],
  nsaAssessor: 'A qualified and proficient SRC / Bronze Medallion Trainer, or an Endorsed Delegate appointed and recorded at a Club Board of Management / Directors meeting.'
};

/* Water safety ratio table (SLSA 1.01A s4) for participants without SRC */
NIP.SRR_BANDS = [
  { min: 1, max: 8, label: 'Low risk', ratio: 10, nsa: true },
  { min: 9, max: 15, label: 'Low–mid risk', ratio: 5, nsa: false },
  { min: 16, max: 20, label: 'Moderate risk', ratio: 5, nsa: false },
  { min: 21, max: 24, label: 'Moderate–high risk', ratio: 5, nsa: false },
  { min: 25, max: 27, label: 'High risk', ratio: 0, nsa: false },
  { min: 28, max: 99, label: 'Extreme risk', ratio: 0, nsa: false }
];

/* Season helpers. SLS age groups are set by age at 30 September. */
NIP.currentSeason = function (d = new Date()) {
  // New season from 1 July (preseason), labelled e.g. 2026/27
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
};
NIP.seasonStartYear = s => Number(String(s).slice(0, 4));
NIP.ageGroupFromDob = function (dob, season) {
  if (!dob) return null;
  const y = NIP.seasonStartYear(season || NIP.currentSeason());
  const cut = new Date(y, 8, 30); // 30 September
  const b = new Date(dob + 'T00:00:00');
  if (isNaN(b)) return null;
  let age = cut.getFullYear() - b.getFullYear();
  const m = cut.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && cut.getDate() < b.getDate())) age--;
  const g = 'U' + (age + 1);
  if (age + 1 < 6) return 'U6'; // joined at 5 after 30 Sep: stays U6
  return NIP.AGE_GROUPS.includes(g) ? g : (age + 1 > 14 ? 'U15+' : null);
};
