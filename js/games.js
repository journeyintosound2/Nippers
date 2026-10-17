/* =========================================================================
   Games & activities library
   type: sand | wade | water | surfed
   Any 'wade' or 'water' activity needs a Water Safety Supervisor, a risk
   assessment and water safety at the ratios in SLSA Procedure 1.01A.
   For official competition rules see the current SLSA Surf Sports Manual —
   the versions below are club-session versions you can adapt.
   ========================================================================= */
window.NIP = window.NIP || {};

NIP.GAME_TYPES = {
  sand: { label: 'Sand', hint: 'On the beach — no water safety needed' },
  wade: { label: 'Wade / shallows', hint: 'Water safety required' },
  water: { label: 'Swim / board', hint: 'Water safety required' },
  surfed: { label: 'Surf education', hint: 'Learning through play' }
};

NIP.GAMES = [
  {
    id: 'beach-flags', name: 'Beach Flags', type: 'sand', from: 'U6', to: 'U14',
    time: '15–20 min', players: '6–15 per heat', intensity: 'High',
    equipment: ['Flags (≈30 cm lengths of garden hose or batons)', 'Rope or a line drawn in the sand', 'Whistle'],
    summary: 'The classic. Lie face-down, jump up on the whistle, turn and sprint to grab a flag. There is always one flag fewer than runners.',
    setup: 'Mark a start line. Push the flags upright into the sand 20 m away (10–15 m for U6–U8), spaced 1.5–2 m apart. Use one flag fewer than the number of runners.',
    steps: [
      'Runners lie face-down on the start line, heels on the line, facing AWAY from the flags. Hands are stacked with chin resting on them.',
      'Starter calls “Competitors ready”, then “Heads down”. Wait a moment, then blow the whistle.',
      'Runners get up, turn and sprint to grab a flag. Whoever misses out is eliminated.',
      'Remove one flag and go again until one runner is left.'
    ],
    rules: [
      'No moving after “Heads down” — moving early is a false start (give a warning for younger groups).',
      'No pushing, holding or blocking another runner.',
      'If two runners grab the same flag, whoever had the greater hold keeps it; the referee’s call is final.'
    ],
    safety: [
      'Rake the course first for holes, sticks, shells and glass.',
      'Keep flags well spaced so dives don’t collide.',
      'Group by size, not just age, for younger groups.'
    ],
    variations: [
      'Instead of eliminating, losers do 5 star-jumps and rejoin, so no-one sits out (good for U6–U8).',
      'Reaction start: call “sit”, “knees” or “stand” as the start position.',
      'Team flags: each flag grabbed scores a point for that runner’s team.'
    ],
    skills: ['Reaction time', 'Agility', 'Sprinting']
  },
  {
    id: 'beach-sprint', name: 'Beach Sprint', type: 'sand', from: 'U6', to: 'U14',
    time: '10–15 min', players: '4–8 per heat', intensity: 'High',
    equipment: ['Cones or flags for lanes', 'Finish rope or line', 'Whistle'],
    summary: 'A straight sprint on soft sand. It’s simple, fast and good for heats and finals.',
    setup: 'Mark 4–8 lanes 30–70 m long (shorter for little ones) with a clear start and finish line.',
    steps: [
      'Runners stand or crouch behind the start line in their lane.',
      '“Set”, then whistle.',
      'First across the finish (chest across the line) wins. Run heats, then a final.'
    ],
    rules: ['Stay in your own lane.', 'Two false starts in a heat means the runner sits out that heat.'],
    safety: ['Check the course for hazards.', 'Run along the beach, not up the slope, to protect ankles.'],
    variations: ['Handicap starts', 'Partner piggy-back sprint for older groups (short course)', 'Backwards sprint for a laugh'],
    skills: ['Speed', 'Starts']
  },
  {
    id: 'beach-relay', name: 'Beach Relay', type: 'sand', from: 'U6', to: 'U14',
    time: '15 min', players: 'Teams of 4', intensity: 'High',
    equipment: ['Batons (one per team)', 'Cones'],
    summary: 'Shuttle-style relay. Runners face each other across the course and pass the baton hand to hand.',
    setup: 'For each team, put two cones 30–50 m apart. Two runners stand at each end.',
    steps: [
      'Runner 1 sprints across with the baton and hands it to runner 2 at the far end.',
      'Runner 2 sprints back to runner 3, and so on.',
      'The team finishes when runner 4 crosses the line holding the baton.'
    ],
    rules: [
      'The baton must be passed hand to hand. It can’t be thrown.',
      'The waiting runner must stay behind the line until they have the baton.',
      'A dropped baton must be picked up by the runner who dropped it.'
    ],
    safety: ['Leave space between lanes so teams don’t collide at handover.'],
    variations: ['Sand-bucket relay: carry a bucket of dry sand. Least spilt wins.', 'Mixed age-group teams with a younger buddy'],
    skills: ['Teamwork', 'Speed', 'Handover skills']
  },
  {
    id: 'rips-and-swimmers', name: 'Rips & Swimmers (tag)', type: 'surfed', from: 'U6', to: 'U11',
    time: '10–15 min', players: '10–30', intensity: 'High',
    equipment: ['Cones to mark a “beach” and an “ocean” zone', 'Two rescue tubes or pool noodles (optional)'],
    summary: 'A tag game that teaches what to do in a rip: stay calm, raise an arm, wait for help.',
    setup: 'Mark a rectangle about 20 × 30 m. One end is the beach (safe), the other is the ocean.',
    steps: [
      'Pick 2–3 “rips” (taggers) who stand in the middle. Everyone else is a swimmer at the ocean end.',
      'On “Swim to shore!” the swimmers run for the beach end. The rips try to tag them.',
      'A tagged swimmer stays still with ONE ARM RAISED, calling for help.',
      'Two “lifesavers” (carrying a noodle or tube) can free a tagged swimmer by touching them and running them to the beach.',
      'Swap roles every few rounds.'
    ],
    rules: ['A tagged swimmer must keep one arm raised until rescued. That is the real distress signal.'],
    safety: ['Tags are touches on the back or shoulder only.'],
    variations: ['Add “float” calls: tagged swimmers lie on their backs (starfish) instead.', 'Use more lifesavers as the group gets bigger.'],
    skills: ['Rip survival: relax and float, raise an arm', 'Agility'],
    debrief: 'Ask: what do you do if you are caught in a rip? (Stay calm, float, raise an arm for help, and swim parallel to the beach or towards breaking waves if you can.)'
  },
  {
    id: 'between-the-flags', name: 'Between the Flags', type: 'surfed', from: 'U6', to: 'U9',
    time: '10 min', players: 'Any', intensity: 'Medium',
    equipment: ['Two red and yellow flags (or red and yellow cones)', 'Red flag (beach closed)', 'Whistle'],
    summary: 'A “Simon says” game that drills the most important beach-safety rule: swim between the red and yellow flags.',
    setup: 'Plant two red and yellow flags 10–15 m apart along the beach. Kids spread out along the line.',
    steps: [
      'Call “SWIM!”. Everyone must run and stand between the flags. The last one in, or anyone outside, does a lap or becomes a helper.',
      'Call “SUN!”. Everyone does the slip-slop-slap actions.',
      'Call “RIP!”. Everyone floats on their back on the sand with one arm raised.',
      'Hold up the red flag and call “CLOSED!”. Everyone must sit down. Anyone who heads to the water is out.',
      'Move the flags between rounds to show that flags move with the conditions.'
    ],
    rules: ['Only the age manager can move the flags.'],
    safety: [],
    variations: ['Add “PATROL!”: kids salute and point to the patrol tent.'],
    skills: ['Flags knowledge', 'Listening'],
    debrief: 'Ask: why do the flags move during the day? Who puts them up?'
  },
  {
    id: 'lifesaver-says', name: 'Lifesaver Says', type: 'surfed', from: 'U6', to: 'U14',
    time: '5–10 min', players: 'Any', intensity: 'Low',
    equipment: ['None'],
    summary: 'Simon Says with lifesaving actions. It works well as a warm-up or while you wait for water safety to set up.',
    setup: 'Group facing the leader.',
    steps: [
      'The leader gives actions, e.g. “Lifesaver says: raise one arm and wave for help”, “Lifesaver says: starfish float”, “Lifesaver says: dolphin dive”.',
      'Anyone who follows an action without “Lifesaver says” in front of it does a quick challenge (5 squats), then jumps back in.'
    ],
    rules: [],
    safety: [],
    variations: [
      'U11–U14: use the official beach-to-water and water-to-beach signals from your SRC / Surf Education manual. This builds towards the SRC and NSA signals knowledge.',
      'Let a nipper be the leader.'
    ],
    skills: ['Distress signal', 'Lifesaving signals']
  },
  {
    id: 'rip-spotting', name: 'Rip Spotter Walk', type: 'surfed', from: 'U8', to: 'U14',
    time: '10–15 min', players: 'Age group', intensity: 'Low',
    equipment: ['Clipboard or the patrol whiteboard (optional)'],
    summary: 'Walk the beach and teach the nippers to spot rips from the sand.',
    setup: 'Choose a high spot (dune or the clubhouse deck) with a view of the surf.',
    steps: [
      'Ask the nippers to find the spot where waves are NOT breaking.',
      'Point out the signs of a rip: deeper, darker water; fewer breaking waves; a rippled surface; sand or foam moving out to sea.',
      'Each nipper points to where they think a rip is. Then discuss as a group.',
      'Finish with the survival plan: relax and float, raise an arm for help, and swim parallel to the beach or towards breaking waves.'
    ],
    rules: [],
    safety: ['Stay on the sand.'],
    variations: ['Ask the patrol captain to talk to the group.', 'Older nippers draw the beach and mark the rips and safe areas.'],
    skills: ['Surf awareness', 'Rip identification']
  },
  {
    id: 'true-false-run', name: 'True or False Run', type: 'surfed', from: 'U7', to: 'U14',
    time: '10 min', players: 'Any', intensity: 'Medium',
    equipment: ['Two cones labelled TRUE and FALSE'],
    summary: 'A surf-education quiz you run in. Players sprint to the answer they think is right.',
    setup: 'Put the TRUE and FALSE cones 15 m apart, with the group in the middle.',
    steps: [
      'Read a statement, e.g. “You should swim at night if the water is calm.”',
      'Nippers run to TRUE or FALSE.',
      'Reveal the answer, explain why, and go again from the middle.'
    ],
    rules: [],
    safety: [],
    variations: ['Points for correct answers in teams.'],
    skills: ['Surf education'],
    questions: [
      ['Swim between the red and yellow flags.', true],
      ['If you are caught in a rip you should swim straight back to the beach as hard as you can.', false],
      ['Raising one arm in the water is the signal that you need help.', true],
      ['A rip is often a calm-looking gap between breaking waves.', true],
      ['It is fine to swim alone if you are a strong swimmer.', false],
      ['Bluebottle stings should be rinsed with seawater.', true],
      ['Lifesavers wear red and yellow.', true],
      ['A red flag means the beach is closed.', true]
    ]
  },
  {
    id: 'wade-race', name: 'Wade Race', type: 'wade', from: 'U6', to: 'U10',
    time: '10–15 min', players: '4–8 per heat', intensity: 'High',
    equipment: ['Marker buoy, cone or flag at the turn', 'Finish flags on the beach'],
    summary: 'Run into the shallows, around a marker, and back up the beach to finish. It’s the main water race for U8s.',
    setup: 'With water safety in place, set a turning marker in knee-deep water for U6–U7 or no deeper than waist-deep for U8+. Mark the finish on dry sand.',
    steps: [
      'Start in a line on the sand at the water’s edge.',
      'On the whistle, wade or high-knee run out, go around the marker and come back.',
      'Sprint up the beach to the finish.'
    ],
    rules: ['Go around the marker the same way as everyone else (e.g. right shoulder).', 'Swimming isn’t allowed. It’s a wade.'],
    safety: [
      'A Water Safety Supervisor is on the beach, with water safety in the water at the required ratio (SRR low risk: 1:10; NSAs can help for U8 and below).',
      'Do a head count before and after every heat.',
      'Coloured caps on, secured under the chin.'
    ],
    variations: ['Dolphin-dive leg for U9–U10.', 'Relay version: tag the next teammate on the sand.'],
    skills: ['Moving through water', 'Surf confidence']
  },
  {
    id: 'dolphin-dive-relay', name: 'Dolphin Dive Relay', type: 'wade', from: 'U8', to: 'U14',
    time: '15 min', players: 'Teams of 4–6', intensity: 'High',
    equipment: ['Cones/markers in the shallows'],
    summary: 'Relay that practises dolphin diving, the quickest way to get through the shallows and under small waves.',
    setup: 'Teams line up at the water’s edge, with a marker in waist-deep water for each team.',
    steps: [
      'First, demonstrate dolphin diving: dive forward and down, plant your hands on the sand, pull your feet under you and spring forward again.',
      'Each nipper dolphin-dives out to the marker, rounds it, and runs back to tag the next teammate.'
    ],
    rules: ['Only dolphin dives on the way out, no walking.'],
    safety: ['Water safety required.', 'Only in gentle shore break. Pick a spot with a sandy bottom and no hidden gutters.', 'Check depth: too shallow risks head and neck injury; it must be at least thigh deep to dive.'],
    variations: ['Count dives to the marker. Fewest dives wins.'],
    skills: ['Dolphin diving', 'Surf entry'],
    prelim: ['Submersion']
  },
  {
    id: 'starfish-float', name: 'Starfish Float Challenge', type: 'wade', from: 'U6', to: 'U9',
    time: '10 min', players: 'Pairs', intensity: 'Low',
    equipment: ['Pool noodles (optional)', 'Stopwatch'],
    summary: 'Practise the back float that the preliminary evaluation tests, as a game: who can be the stillest starfish?',
    setup: 'In calm, knee- to waist-deep water, set the nippers up in buddy pairs.',
    steps: [
      'One buddy floats on their back with arms and legs spread like a starfish. The other buddy counts out loud.',
      'Start with a noodle under the shoulders, then try without.',
      'Practise recovering to standing: tuck the knees, sweep the arms forward, stand.',
      'Swap roles. Try to beat your own time (U6: 5 s, U7: 10 s, U8: 15 s are the evaluation targets).'
    ],
    rules: [],
    safety: ['Water safety required.', 'Stay in standing depth for every nipper.'],
    variations: ['Front float (“dead man’s float”) with a big breath in.', 'Starfish to pencil: change shape while floating.'],
    skills: ['Flotation', 'Recovering to stand'],
    prelim: ['Flotation']
  },
  {
    id: 'treasure-dive', name: 'Treasure Dive', type: 'wade', from: 'U6', to: 'U11',
    time: '10–15 min', players: 'Small groups', intensity: 'Medium',
    equipment: ['Sinking dive rings, sticks or shells (bright colours)'],
    summary: 'Find the treasure on the bottom. This builds comfort putting your head under, which is the submersion skill.',
    setup: 'Drop sinking rings or sticks in calm water no deeper than waist depth for the smallest nipper.',
    steps: [
      'Nippers duck under, touch the bottom and bring up one item at a time.',
      'Teams compete to collect the most, or to collect one of each colour.'
    ],
    rules: [],
    safety: ['Water safety required.', 'Only in clear, calm water. Skip it if visibility is poor or there’s a shore dump.'],
    variations: ['Older groups: do a forward roll before picking up an item (U11+ evaluation skill).'],
    skills: ['Submersion', 'Breath control'],
    prelim: ['Submersion']
  },
  {
    id: 'fill-the-bucket', name: 'Fill the Bucket Relay', type: 'wade', from: 'U6', to: 'U12',
    time: '10–15 min', players: 'Two teams (or more)', intensity: 'High',
    equipment: ['One bucket per team (mark a fill line with tape or marker)', 'One plastic cup per team', 'Cones for start lines'],
    summary: 'Teams race to fill their bucket one cup at a time: run to the water, scoop, run back, pour, hand over the cup. First full bucket wins.',
    setup: 'Put each team’s bucket on the sand 10–20 m up from the water’s edge, with a cone start line next to it. Teams line up single file behind their bucket. The first runner in each team holds the cup.',
    steps: [
      'On the whistle, the first runner sprints to the water’s edge, scoops a cupful and runs back.',
      'They pour the water into their team’s bucket, then hand the cup to the next person in line.',
      'The runner goes to the back of the line and the next person goes.',
      'Keep going until a bucket reaches the fill line. That team wins.'
    ],
    rules: [
      'Scoop at the water’s edge only, no deeper than ankle/shin deep.',
      'The cup must be handed over, not thrown.',
      'Water must go into the bucket from standing beside it, no pouring from a distance.',
      'Spilt water doesn’t count. Go back and get more.'
    ],
    safety: [
      'Even at the water’s edge, follow your club’s water safety plan and have an age manager standing at the shoreline.',
      'Keep teams’ running lanes well apart so nobody collides on the way back.',
      'Head count before and after.'
    ],
    variations: [
      'Sponge version: soak a sponge instead of using a cup and squeeze it into the bucket. It’s slower and wetter.',
      'Holey cup: poke a few holes in the cup so runners have to be quick.',
      'Older groups: put the buckets further up the beach, or make runners carry the cup on their head.',
      'Time trial: one team at a time against the clock.'
    ],
    skills: ['Teamwork', 'Speed', 'Fun in the water']
  },
  {
    id: 'overhead-pour', name: 'Overhead Pour Relay', type: 'sand', from: 'U6', to: 'U14',
    time: '10–15 min', players: 'Two teams of 6–10', intensity: 'Low',
    equipment: ['One plastic cup per person', 'A bucket of seawater per team (or the water’s edge)', 'Something to measure with (a clear cup or a ruler) for the judging'],
    summary: 'Pass water down the line by pouring it backwards over your head into the cup of the person behind you. The team with the most water left at the end wins. Messy, funny and perfect for a hot day.',
    setup: 'Teams line up in two straight lines, everyone facing the same way, about an arm’s length apart. Everyone holds a cup. Fill the front person’s cup to the brim from the bucket.',
    steps: [
      'On “Go”, the front person holds their cup over their head and pours it backwards, without turning around.',
      'The person behind them holds their own cup up and moves it around to catch as much water as they can.',
      'That person then pours over their own head to the next person, and so on down the line.',
      'When the water reaches the last person, the team stops. Line the back two cups up side by side.',
      'The team whose last person has the most water in their cup wins.'
    ],
    rules: [
      'No turning around to pour. The cup must go back over your own head.',
      'Catchers can move their cup but can’t move their feet.',
      'Don’t refill along the way. The water you lose is gone.'
    ],
    safety: [
      'Use seawater from a bucket, not the hose.',
      'Soft plastic cups only. No glass or hard drink bottles.'
    ],
    variations: [
      'Two rounds: switch who is at the front.',
      'Sideways pour: pass to the left over your shoulder.',
      'Under-and-over: alternate over the head, then between the legs.',
      'Blindfold the catchers (older groups) and let the pourer give directions.'
    ],
    skills: ['Teamwork', 'Communication', 'Cool-down']
  },
  {
    id: 'run-swim-run', name: 'Run-Swim-Run', type: 'water', from: 'U9', to: 'U14',
    time: '15–20 min', players: 'Heats of 6–10', intensity: 'High',
    equipment: ['Swim cans / buoys', 'Finish flags', 'Coloured caps'],
    summary: 'Run in, swim around the cans and run back up the beach. It’s a key race for older nippers.',
    setup: 'Set the course to suit the conditions and the group’s ability. Distances must stay within what the group has shown it can swim.',
    steps: [
      'Start on the sand.',
      'Run into the water, swim around the cans (usually turning one way) and swim back.',
      'Run up the beach to the finish.'
    ],
    rules: ['Go around every can in the order set. Missing one is a DQ in races.'],
    safety: [
      'Only for nippers who passed this season’s preliminary evaluation. Count the Competition Evaluation if it’s an official race.',
      'Water safety at 1:5 (1:10 only in low-risk conditions), with 75% of water safety in the water.',
      'Head count before and after.'
    ],
    variations: ['Run-wade-run for U8s.', 'Handicapped start by ability, not just age.'],
    skills: ['Surf swimming', 'Transitions'],
    prelim: ['Propulsion']
  },
  {
    id: 'board-relay', name: 'Nipper Board Relay', type: 'water', from: 'U9', to: 'U14',
    time: '20 min', players: 'Teams of 3–4', intensity: 'High',
    equipment: ['Nipper boards (soft boards)', 'Turning buoys'],
    summary: 'A board-paddling relay around a buoy, with a tag on the beach. It builds board-handling skills.',
    setup: 'Set the turning buoy close to shore in gentle conditions. Teams line up on the sand.',
    steps: [
      'Teach the basics first: paddling on knees or prone, and keeping the nose up.',
      'Nipper 1 runs the board in, paddles around the buoy and back, then runs to tag nipper 2.'
    ],
    rules: ['Stay on your own course. No ramming another board.'],
    safety: ['Water safety required. Only in low swell.', 'Teach “lose your board: protect your head and let it go”.', 'Group by ability.'],
    variations: ['Two-up paddling for younger or less confident nippers.'],
    skills: ['Board skills', 'Surf confidence']
  },
  {
    id: 'rescue-tube-relay', name: 'Rescue Tube Relay (sand)', type: 'sand', from: 'U10', to: 'U14',
    time: '15 min', players: 'Teams of 4', intensity: 'Medium',
    equipment: ['Rescue tubes (one per team)', 'Cones'],
    summary: 'A dry-land introduction to the rescue tube: putting on the sash, running with it, and handing it to a “patient”.',
    setup: 'Put a “patient” on a cone 20 m away for each team.',
    steps: [
      'Show how to wear the sash over one shoulder and carry the tube.',
      'Nipper 1 runs to the patient, says “I’m here to help, grab the tube”, and the patient holds the tube while they jog back together.',
      'The patient becomes the next rescuer.'
    ],
    rules: ['The rescuer must talk to the patient before handing over the tube.'],
    safety: [],
    variations: ['Run it in waist-deep water later in the season with full water safety.'],
    skills: ['Rescue skills', 'Communication', 'Pathway to SRC / NSA']
  },
  {
    id: 'crab-soccer', name: 'Crab Soccer', type: 'sand', from: 'U6', to: 'U12',
    time: '10–15 min', players: 'Two teams', intensity: 'Medium',
    equipment: ['Soft ball or beach ball', '4 cones for goals'],
    summary: 'Soccer in the crab walk position (hands and feet, tummy up). It builds strength and gets lots of laughs.',
    setup: 'Small field, about 15 × 20 m, with cone goals at each end.',
    steps: ['Players move only in the crab-walk position.', 'Kick or head the ball. No hands.'],
    rules: ['Bottoms can’t sit on the sand for more than 3 seconds.'],
    safety: ['Use a soft ball. Rake the area for shells first.'],
    variations: ['Two balls at once.'],
    skills: ['Core strength', 'Teamwork']
  },
  {
    id: 'capture-the-flag', name: 'Capture the Flag', type: 'sand', from: 'U8', to: 'U14',
    time: '20 min', players: 'Two teams', intensity: 'High',
    equipment: ['Two flags', 'Cones', 'Coloured caps or bibs for teams'],
    summary: 'Get the other team’s flag back to your side without being tagged.',
    setup: 'Split a large area in half with cones. Each team has a flag at the back of its half and a “patrol tower” jail.',
    steps: [
      'Players cross into the enemy half to try to grab the flag.',
      'A player tagged in enemy territory goes to the patrol tower. A teammate can free them with a tag.',
      'First team to bring the flag back to its own half wins.'
    ],
    rules: ['Two-hand touch tag only.', 'No guarding within 3 m of your own flag.'],
    safety: ['Keep clear of the water and the public.'],
    variations: ['Flags = rescue tubes.'],
    skills: ['Fitness', 'Strategy']
  },
  {
    id: 'octopus', name: 'Octopus', type: 'sand', from: 'U6', to: 'U9',
    time: '10 min', players: '10+', intensity: 'High',
    equipment: ['Cones'],
    summary: 'The fish run from one side to the other. Tagged fish turn into seaweed and help catch the rest.',
    setup: 'Rectangle 15 × 25 m. One “octopus” in the middle.',
    steps: [
      'Octopus calls “Fishies, fishies, come swim in my ocean!”',
      'Fish run to the other side. Tagged fish freeze as “seaweed” and can tag runners from where they stand, with arms only.',
      'The last fish left becomes the next octopus.'
    ],
    rules: ['Seaweed can’t move their feet.'],
    safety: [],
    variations: ['Call “Rip!”: fish have to run backwards.'],
    skills: ['Agility', 'Warm-up']
  },
  {
    id: 'flags-up', name: 'Red Flag, Green Light', type: 'surfed', from: 'U6', to: 'U10',
    time: '10 min', players: 'Any', intensity: 'Medium',
    equipment: ['A red and yellow flag', 'A red flag (or red cone)', 'Cones for start and finish lines', 'Whistle (optional)'],
    summary: 'Red Light, Green Light with a lifesaving twist. The “lifeguard” uses beach calls instead of colours, so kids learn what the flags, a rip and the siren mean while they play.',
    setup: 'Mark a start line and a finish line 20–30 m apart on the sand. The age manager (the “lifeguard”) stands at the finish holding the flags. Nippers line up on the start line.',
    steps: [
      '“RED AND YELLOW!” (wave the red and yellow flag): everyone moves towards the lifeguard. That’s the green light.',
      '“RED FLAG!” (hold up the red flag): everyone FREEZES. The beach is closed. Anyone still moving goes back to the start.',
      '“RIP!”: everyone lies on their back like a starfish with ONE ARM RAISED, calling for help, until the lifeguard waves them on.',
      '“SIREN!” (or three short whistles): everyone runs back to the start line, the way you’d get out of the water when the siren sounds.',
      'The first nipper to tag the lifeguard becomes the next lifeguard.'
    ],
    rules: [
      'Only the lifeguard’s calls count. No one else can call.',
      'Moving on a red flag = back to the start.',
      'On “Rip”, you must have one arm up until you’re waved on.'
    ],
    safety: ['Play on dry sand away from the water.', 'No pushing on the “Siren” run back.'],
    variations: [
      'Add “PATROL!”: nippers salute and point to the patrol tent.',
      'Add “SHARK!”: everyone makes a fin and freezes (younger groups love this).',
      'Older groups: hand over the flags and let a nipper be the lifeguard.',
      'Quiz version: on red flag, the lifeguard asks a surf safety question. A correct answer earns 3 giant steps forward.'
    ],
    skills: ['Flags knowledge', 'Rip survival: float and raise an arm', 'Listening'],
    debrief: 'Ask: what does a red flag mean? What do you do if you hear the siren? What do you do if you’re caught in a rip?'
  },
  {
    id: 'tunnel-ball', name: 'Over-Under Relay', type: 'sand', from: 'U6', to: 'U10',
    time: '10 min', players: 'Teams of 6–10', intensity: 'Medium',
    equipment: ['One ball per team'],
    summary: 'Pass the ball over the head and then through the legs down the line. The back person runs to the front.',
    setup: 'Teams stand in single-file lines.',
    steps: [
      'The front player passes over their head, the next passes under their legs, and so on (over, under).',
      'The last player runs to the front and starts again.',
      'Finish when the original front player is back at the front.'
    ],
    rules: ['A dropped ball goes back to the player who dropped it.'],
    safety: [],
    variations: ['Use a full bucket of water for a wet version.'],
    skills: ['Teamwork', 'Warm-up']
  },
  {
    id: 'mini-iron', name: 'Mini Ironperson', type: 'wade', from: 'U7', to: 'U14',
    time: '20–30 min', players: 'Heats of 6–10', intensity: 'High',
    equipment: ['Flags', 'Cones', 'Buoys', 'Boards (U9+)'],
    summary: 'A multi-leg race made from the other events: sprint, wade (or swim/board for older groups) and a flags finish.',
    setup: 'Lay out a loop: a sand sprint to the water, a wade or swim leg around a marker, then back to a flag to grab at the finish.',
    steps: [
      'U7–U8: sprint, wade, sprint, then grab a flag.',
      'U9+: run, swim, run, board (if competent), then sprint to finish.'
    ],
    rules: ['Complete legs in order.'],
    safety: ['Water legs need full water safety and head counts.', 'Match each leg to what the group can do.'],
    variations: ['Teams of 3: each person does one leg.'],
    skills: ['Endurance', 'Transitions']
  },
  {
    id: 'sand-sculpture', name: 'Lifesaving Sand Sculpture', type: 'sand', from: 'U6', to: 'U14',
    time: '15–20 min', players: 'Small teams', intensity: 'Low',
    equipment: ['Buckets', 'Spades', 'Shells/seaweed for decoration'],
    summary: 'A calm cool-down. Teams build something lifesaving-themed: an IRB, the patrol tower, a rip map.',
    setup: 'Give each team a patch of damp sand and a theme.',
    steps: ['Build for 15 minutes.', 'Teams explain their sculpture. Older nippers must include a safety message.'],
    rules: [],
    safety: ['Sun safety. Use shade if possible.'],
    variations: ['Build a beach model showing the flags, a rip and a safe swimming area.'],
    skills: ['Creativity', 'Surf education']
  },
  {
    id: 'stuck-in-the-mud', name: 'Stuck in the Mud (Bluebottles)', type: 'sand', from: 'U6', to: 'U10',
    time: '10 min', players: '10+', intensity: 'High',
    equipment: ['None (pool noodles for taggers optional)'],
    summary: 'The taggers are bluebottles. Stung players freeze until a friend frees them, which is a chance to teach the first aid.',
    setup: 'Defined playing area on the sand.',
    steps: [
      'Two or three “bluebottles” tag players.',
      'Stung players freeze, arms out.',
      'A friend frees them by crawling under their arm while calling “rinse with seawater!”.'
    ],
    rules: [],
    safety: [],
    variations: ['Free each other by saying the right first-aid step for bluebottles.'],
    skills: ['First aid awareness', 'Fitness'],
    debrief: 'Bluebottle first aid: rinse with seawater, pick off any tentacles, then use hot water (as hot as is comfortable) or ice for pain.'
  }
];
