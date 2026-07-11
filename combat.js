/* combat.js — telegraphed, locational combat. The enemy declares its attack
   (name, kind, aimed part, power) BEFORE the player chooses a verb, so every
   hit taken is the consequence of a visible choice:
     evade  — dodge roll off mobility (zeroed if LEGS are gone)
     block  — soak with guard (bonus per intact Bastion Plate; melee blocks best)
     trade  — attack through it, take the hit full
     peek   — read exact hull + keep initiative, small evade
     purge  — vent heat, stand in the open
   Damage kinds: kinetic (full), thermal (less integrity, +heat), melee (blockable). */

var MECHAB = window.MECHAB || (window.MECHAB = {});

(function (M) {
  var AIMS = [["TORSO",30],["ARM_L",22],["ARM_R",22],["LEGS",18],["HEAD",8]];
  var ATTACKS = [
    { name:"AC BURST",        kind:"kinetic", lo:8,  hi:13 },
    { name:"LANCE ROUND",     kind:"kinetic", lo:12, hi:18 },
    { name:"FLAMER SWEEP",    kind:"thermal", lo:8,  hi:12 },
    { name:"PLASMA JET",      kind:"thermal", lo:12, hi:16 },
    { name:"BREACH CLAW",     kind:"melee",   lo:10, hi:16 },
    { name:"WRECKING HAMMER", kind:"melee",   lo:14, hi:20 },
  ];
  var ENEMIES = [
    { name:"SCRAP HOUND",    arch:"hound",  hp:32, kinds:["kinetic","melee"] },
    { name:"WATCH SPIDER",   arch:"spider", hp:42, kinds:["kinetic","thermal"] },
    { name:"FURNACE KNIGHT", arch:"knight", hp:56, kinds:["melee","thermal"] },
  ];
  function pick(a){ return a[(Math.random()*a.length)|0]; }

  M.Combat = {
    newSortie: function (){
      var q = [ENEMIES[0], pick(ENEMIES.slice(1))].map(function (e){
        return { name:e.name, arch:e.arch, hp:e.hp, maxHp:e.hp, kinds:e.kinds,
                 seed:(Math.random()*0xffffffff)>>>0 };   // seeded look per contact
      });
      return { queue:q, idx:0 };
    },
    enemy: function (s){ return s.queue[s.idx]; },

    telegraph: function (enemy){
      var pool = ATTACKS.filter(function (a){ return enemy.kinds.indexOf(a.kind) >= 0; });
      var a = pick(pool);
      var roll = Math.random()*100, acc = 0, aim = "TORSO";
      for (var i=0;i<AIMS.length;i++){ acc += AIMS[i][1]; if (roll < acc){ aim = AIMS[i][0]; break; } }
      return { name:a.name, kind:a.kind, aim:aim, power:a.lo + ((Math.random()*(a.hi-a.lo+1))|0) };
    },

    evadeChance: function (stats, broken){
      return (broken && broken.LEGS) ? 0 : Math.min(0.85, 0.25 + stats.mobility*0.028);
    },
    guardValue: function (loadout, broken){
      var gv = 10;
      ["ARM_L","ARM_R"].forEach(function (s){
        if (loadout[s] === "arm_shield" && !(broken && broken[s])) gv += 8;
      });
      return gv;
    },

    resolve: function (id, tg, stats, loadout, broken){
      var v = M.VERBS[id];
      var r = { lines:[], dmgEnemy:0, taken:0, aim:tg.aim,
                heatAdd:Math.max(0, v.heat), purge:v.react==="purge", peek:false };
      var incoming = tg.power;

      if (v.react === "evade"){
        var ch = M.Combat.evadeChance(stats, broken);
        if (Math.random() < ch){ incoming = 0; r.lines.push(["▸ "+v.label+" — slipped the "+tg.name+" clean.","now"]); }
        else { incoming = Math.ceil(incoming*0.45); r.lines.push(["▸ "+v.label+" — clipped on the way out.","warn"]); }
      } else if (v.react === "block"){
        var gv = M.Combat.guardValue(loadout, broken);
        if (tg.kind === "melee") gv = Math.ceil(gv*1.5);
        var soaked = Math.min(incoming, gv);
        incoming -= soaked;
        r.lines.push(["▸ "+v.label+" — soaked "+soaked+(incoming===0?" — fully absorbed.":" of it."),"now"]);
      } else if (v.react === "peek"){
        r.peek = true;
        r.lines.push(["▸ "+v.label+" — enemy hull and intent read.","now"]);
      } else if (v.react === "purge"){
        r.lines.push(["⁃ VENT — heat purged; standing in the open.","warn"]);
      } else { // trade
        r.dmgEnemy = v.dmg || 0;
        if (id === "RAM") r.dmgEnemy += Math.ceil(stats.weight/4);
        r.lines.push(["▸ "+v.label+" — dealt "+r.dmgEnemy+" to hull.","now"]);
      }

      if (incoming > 0){
        if (tg.kind === "thermal"){
          r.taken = Math.ceil(incoming*0.5); r.heatAdd += 3;
          r.lines.push(["✚ "+tg.name+" scorches "+tg.aim+" for "+r.taken+" (+3 HEAT).","bad"]);
        } else {
          r.taken = incoming;
          r.lines.push(["✚ "+tg.name+" hits "+tg.aim+" for "+r.taken+".","bad"]);
        }
      }
      return r;
    },
  };
})(window.MECHAB);
