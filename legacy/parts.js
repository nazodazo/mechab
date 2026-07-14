/* parts.js — THE data structure. One array drives the sprite, the stats, and
   the decision vocabulary. Add a part here and it shows up everywhere, for free.

   A "verb" is a tagged modular action. Parts GRANT verb ids; encounter logic
   reacts to which verb slots are filled, never to specific parts. That keeps
   content-authoring sane while builds stay load-bearing in the decision layer. */

/* var, not const: these files share the global scope as classic scripts,
   and a repeated top-level const is a SyntaxError that kills the whole file. */
var MECHAB = window.MECHAB || (window.MECHAB = {});

// slot order = draw order (back to front) for the portrait compositor
MECHAB.SLOTS = ["LEGS", "TORSO", "ARM_L", "ARM_R", "HEAD"];

/* react: how the verb interacts with the INBOUND telegraph —
   "trade" attacks (take the hit, deal dmg) · "evade" dodge roll (mobility)
   · "block" soak with guard · "peek" reveal enemy state · "purge" vent heat */
MECHAB.VERBS = {
  RAM:      { label: "Brace & Ram",  slot: "mobility", heat: 2, power: 1, react: "trade", dmg: 9,  desc: "Close and slam. Trades position for shock." },
  STRIDE:   { label: "Evade",        slot: "mobility", heat: 0, power: 1, react: "evade",          desc: "Break line — dodge the inbound." },
  VOLLEY:   { label: "Volley",       slot: "ranged",   heat: 2, power: 2, react: "trade", dmg: 7,  desc: "Sustained ranged fire." },
  CALLED:   { label: "Called Shot",  slot: "ranged",   heat: 4, power: 3, react: "trade", dmg: 16, desc: "Alpha strike. Heat-hungry, high yield." },
  CLEAVE:   { label: "Cleave",       slot: "melee",    heat: 3, power: 2, react: "trade", dmg: 11, desc: "Wide melee arc." },
  BULWARK:  { label: "Bulwark",      slot: "defense",  heat: 0, power: 1, react: "block",          desc: "Raise guard, soak the inbound." },
  SCAN:     { label: "Threat Scan",  slot: "utility",  heat: 0, power: 1, react: "peek",           desc: "Read the field. Reveals hull + intent." },
  VENT:     { label: "Vent Heat",    slot: "utility",  heat: -99, power: 0, react: "purge",        desc: "Purge accumulated heat. Costs the turn." },
};

/* Each part: stats it contributes + verbs it grants. `tint` feeds the sprite. */
MECHAB.PARTS = {
  // ---- LEGS ----
  legs_bipod:  { slot:"LEGS",  name:"Bipod Struts",     tint:"#5a7d6a", integrity:22, heatCap:6, power:-1, weight:6, verbs:["STRIDE"] },
  legs_hydra:  { slot:"LEGS",  name:"Hydraulic Legs",   tint:"#4a6f8a", integrity:30, heatCap:4, power:-2, weight:11, verbs:["STRIDE","RAM"] },
  legs_quad:   { slot:"LEGS",  name:"Quad Chassis",     tint:"#7a6a4a", integrity:38, heatCap:8, power:-2, weight:15, verbs:["STRIDE","BULWARK"] },

  // ---- TORSO (reactor + cooling) ----
  torso_civ:   { slot:"TORSO", name:"Salvage Core",     tint:"#6a7a5a", integrity:26, heatCap:8,  power:6,  weight:8,  verbs:[] },
  torso_mil:   { slot:"TORSO", name:"Military Reactor", tint:"#7a5a5a", integrity:34, heatCap:10, power:10, weight:12, verbs:["SCAN"] },
  torso_over:  { slot:"TORSO", name:"Overclock Plant",  tint:"#8a5a7a", integrity:24, heatCap:6,  power:14, weight:10, verbs:["SCAN"] },

  // ---- ARMS (weapons) ----
  arm_none:    { slot:"*",     name:"— empty —",        tint:"#33443b", integrity:4,  heatCap:0, power:0,  weight:1,  verbs:[] },
  arm_auto:    { slot:"*",     name:"Autocannon",       tint:"#8a8a5a", integrity:10, heatCap:0, power:-2, weight:6,  verbs:["VOLLEY"] },
  arm_rail:    { slot:"*",     name:"Railgun",          tint:"#9aa2b0", integrity:8,  heatCap:0, power:-3, weight:8,  verbs:["CALLED"] },
  arm_saw:     { slot:"*",     name:"Chain Cleaver",    tint:"#b08a5a", integrity:14, heatCap:0, power:-2, weight:9,  verbs:["CLEAVE"] },
  arm_shield:  { slot:"*",     name:"Bastion Plate",    tint:"#5a7a8a", integrity:20, heatCap:2, power:-1, weight:10, verbs:["BULWARK"] },

  // ---- HEAD (sensor) ----
  head_basic:  { slot:"HEAD",  name:"Optic Cluster",    tint:"#6a8a7a", integrity:8,  heatCap:1, power:-1, weight:2,  verbs:[] },
  head_tac:    { slot:"HEAD",  name:"Tactical Array",   tint:"#7aa08a", integrity:10, heatCap:1, power:-2, weight:3,  verbs:["SCAN"] },
};

// which parts are legal in which slot (arms share the "*" pool)
MECHAB.optionsFor = function (slot) {
  return Object.keys(MECHAB.PARTS).filter(function (id) {
    var s = MECHAB.PARTS[id].slot;
    return s === slot || (s === "*" && (slot === "ARM_L" || slot === "ARM_R"));
  });
};

MECHAB.defaultLoadout = function () {
  return { LEGS:"legs_bipod", TORSO:"torso_civ", ARM_L:"arm_auto", ARM_R:"arm_none", HEAD:"head_basic" };
};

/* Aggregate the equipped parts into live stats. */
MECHAB.computeStats = function (loadout) {
  var s = { integrity:0, heatCap:0, powerCap:0, powerDraw:0, weight:0 };
  MECHAB.SLOTS.forEach(function (slot) {
    var p = MECHAB.PARTS[loadout[slot]]; if (!p) return;
    s.integrity += p.integrity;
    s.heatCap   += p.heatCap;
    if (p.power > 0) s.powerCap += p.power; else s.powerDraw += -p.power;
    s.weight    += p.weight;
  });
  s.powerFree = s.powerCap - s.powerDraw;
  s.mobility  = Math.max(1, 20 - s.weight);          // heavier = slower
  s.overdrawn = s.powerFree < 0;
  return s;
};

/* Derive the verb list the loadout authored. In BUILD we list potential verbs;
   in DEPLOY we pass `heat` to gate affordability, and `broken` so destroyed
   parts un-author their verbs — losing an arm loses its moves. */
MECHAB.deriveVerbs = function (loadout, stats, heat, broken) {
  var srcs = {};                                      // verb id -> granting slots
  MECHAB.SLOTS.forEach(function (slot) {
    var p = MECHAB.PARTS[loadout[slot]]; if (!p) return;
    p.verbs.forEach(function (v) { (srcs[v] = srcs[v] || []).push(slot); });
  });
  var ids = Object.keys(srcs).filter(function (id) {  // alive if ANY granting part survives
    return !broken || srcs[id].some(function (s){ return !broken[s]; });
  });
  ids.push("VENT");                                   // vent is the frame's, always
  return ids.map(function (id) {
    var v = MECHAB.VERBS[id];
    var affordable = heat == null ? true
      : (id === "VENT" ? true : (heat + v.heat) <= stats.heatCap && stats.powerFree >= 0);
    return { id:id, label:v.label, slot:v.slot, heat:v.heat, power:v.power,
             react:v.react, dmg:v.dmg||0, desc:v.desc, affordable:affordable };
  }).sort(function (a,b){ return a.slot.localeCompare(b.slot); });
};
