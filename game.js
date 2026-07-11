/* game.js — wiring. Persistent chassis from the hangar roster; auxiliaries
   reroll on top. Deploy = telegraphed, locational combat: the INBOUND block
   shows what's coming and where, the verb you pick is your answer, and broken
   parts un-author their verbs. All input arrives as intents. */

(function (M){
  var $ = function (id){ return document.getElementById(id); };

  var hangar = M.Roster.load();

  var S = {
    phase: "build", view: "front",
    loadout: M.defaultLoadout(),
    auxSeed: 0x51ed270b,
    spec: M.Chassis.gen(hangar.list[hangar.cur]),
    sel: "TORSO",
    heat: 0, turn: 0,
    sortie: null, tg: null, partHp: null, broken: null, peeked: false,
  };

  var mech = new M.MechRenderer($("mech"));
  var foe  = new M.FoeRenderer($("foe"));

  function hex8(n){ return (n>>>0).toString(16).toUpperCase().padStart(8,"0"); }

  // ---------- clinical data block ----------
  function datablock(st){
    if (S.phase === "deploy"){
      var e = M.Combat.enemy(S.sortie);
      var hull = S.peeked ? e.hp+"/"+e.maxHp
               : "≈"+(Math.ceil((e.hp/e.maxHp)*4)*25)+"%";
      return [
        "COMBAT LOG // CONTACT "+(S.sortie.idx+1)+"/"+S.sortie.queue.length,
        "HOSTILE: <b>"+e.name+"</b> // HULL "+hull,
        "UNIT: <b>"+S.spec.name+"</b> // TURN "+(S.turn+1),
        "HEAT "+S.heat+"/"+st.heatCap+" // MASS "+st.weight+"kg",
      ].join("\n");
    }
    return [
      "STABILITY LAB // STREAM OPEN // BH-V"+hex8(S.spec.seed).slice(0,4),
      "SUBJECT: <b>"+S.spec.name+"</b> // FRAME "+hex8(S.spec.seed),
      "AUX PATTERN "+hex8(S.auxSeed).slice(0,4)+" // HANGAR "+(hangar.cur+1)+"/"+hangar.list.length,
      "CORE: "+M.PARTS[S.loadout.TORSO].name+" · DRAW <b>"+st.powerDraw+"</b>/"+st.powerCap+(st.overdrawn?" ⚠ OVERDRAWN":""),
      "ARMS: "+M.PARTS[S.loadout.ARM_L].name+" / "+M.PARTS[S.loadout.ARM_R].name,
    ].join("\n");
  }

  // ---------- inbound telegraph ----------
  function renderInbound(st){
    var el = $("inbound");
    if (S.phase !== "deploy" || !S.tg){ el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    if (S.broken.HEAD){
      el.innerHTML = '<span class="tag-in">INBOUND</span> ?? — SENSORS OFFLINE — ??';
      return;
    }
    var t = S.tg;
    var evd = Math.round(M.Combat.evadeChance(st, S.broken)*100);
    var gv  = M.Combat.guardValue(S.loadout, S.broken);
    el.innerHTML =
      '<span class="tag-in">INBOUND</span> <b>'+t.name+'</b> → '+t.aim.replace("_"," ")
      + ' // PWR '+t.power+' // '+t.kind.toUpperCase()
      + '\n<span class="hint">evade '+evd+'% · guard '+gv+(t.kind==="melee"?" (×1.5 vs melee)":"")
      + ' · attacking trades full</span>';
  }

  // ---------- stat bars ----------
  function bar(lbl, frac, extra, hot){
    var pct = Math.round(Math.max(0,Math.min(1,frac))*100);
    return '<div class="sb'+(hot?" hot":"")+'"><span class="lbl">'+lbl+'</span>'
         + '<span class="track"><i style="width:'+pct+'%"></i></span>'
         + '<span class="pct">'+(extra!=null?extra:pct+" %")+'</span></div>';
  }
  function statbars(st){
    var html;
    if (S.phase === "deploy"){
      html = bar("HEAT", st.heatCap?S.heat/st.heatCap:0, S.heat+"/"+st.heatCap,
                 st.heatCap && S.heat/st.heatCap>=0.7);
      html += M.SLOTS.map(function (slot){
        var max = M.PARTS[S.loadout[slot]].integrity;
        var hp  = S.partHp[slot];
        return bar(slot.replace("_"," "), max?hp/max:0,
                   S.broken[slot] ? "OFFLINE" : hp+"/"+max,
                   S.broken[slot] || (max && hp/max<=0.35));
      }).join("");
    } else {
      html = bar("INTEGRITY", Math.min(1,st.integrity/60), st.integrity)
           + bar("HEAT CAP", Math.min(1,st.heatCap/20), st.heatCap)
           + bar("POWER", st.powerCap?Math.max(0,st.powerFree)/st.powerCap:0,
                 st.powerFree+" free", st.overdrawn)
           + bar("ANCHOR", st.mobility/20, st.mobility);
    }
    $("statbars").innerHTML = html;
  }

  // ---------- loadout + verbs ----------
  function renderSlots(){
    if (S.phase !== "build"){ $("slots").innerHTML=""; return; }
    $("slots").innerHTML = M.SLOTS.map(function (slot){
      var p = M.PARTS[S.loadout[slot]];
      return '<div class="slot'+(slot===S.sel?" sel":"")+'" data-slot="'+slot+'">'
           +   '<button class="cyc" data-cyc="-1" data-slot="'+slot+'">◀</button>'
           +   '<span class="k">'+slot.replace("_"," ")+'</span>'
           +   '<span class="name">'+p.name+'</span>'
           +   '<button class="cyc" data-cyc="1" data-slot="'+slot+'">▶</button></div>';
    }).join("");
  }
  function effectLabel(v, st){
    if (v.dmg)             return "DMG "+v.dmg+(v.id==="RAM"?"+":"");
    if (v.react==="evade") return "EVD "+Math.round(M.Combat.evadeChance(st,S.broken)*100)+"%";
    if (v.react==="block") return "GRD "+M.Combat.guardValue(S.loadout,S.broken);
    if (v.react==="peek")  return "PEEK";
    return "PURGE";
  }
  function renderVerbs(st){
    var heatArg = S.phase==="deploy" ? S.heat : null;
    var verbs = M.deriveVerbs(S.loadout, st, heatArg, S.broken);
    var head = S.phase==="deploy"
      ? "<div class='hd'>RESPONSE — TURN "+(S.turn+1)+"</div>"
      : "<div class='hd'>ACTIONS THIS BUILD BRINGS ("+verbs.length+")</div>";
    $("verbs").innerHTML = head + verbs.map(function (v){
      var dis = (S.phase==="deploy" && !v.affordable) ? " disabled" : "";
      var cost = v.id==="VENT" ? "−heat" : "+"+v.heat+"H";
      return '<button class="verb" data-verb="'+v.id+'"'+dis+'>'
           +   '<span class="slotk">'+v.slot+'</span><span>'+v.label+'</span>'
           +   '<span class="eff">'+effectLabel(v,st)+'</span>'
           +   '<span class="cost">'+cost+'</span></button>';
    }).join("");
    M._verbCache = verbs;
  }

  // ---------- log ----------
  var logLines = [];
  function log(msg, cls){
    logLines.push('<span class="'+(cls||"")+'">'+msg+'</span>');
    if (logLines.length>50) logLines.shift();
    var el=$("log"); el.innerHTML = logLines.join("\n"); el.scrollTop = el.scrollHeight;
  }

  // ---------- portrait ----------
  function renderPortrait(st){
    var corr = 0.04;
    if (S.phase === "deploy"){
      var dmg = 1 - (S.partHp.TORSO / M.PARTS[S.loadout.TORSO].integrity);
      corr = Math.min(1, (st.heatCap?S.heat/st.heatCap:0)*0.5 + dmg*0.55);
    } else if (st.overdrawn) corr = 0.28;
    mech.render(S.spec, S.loadout, S.auxSeed, S.view, { corruption:corr, broken:S.broken });

    // hostile portrait: only in deploy; falls apart as its hull drops
    if (S.phase === "deploy" && S.sortie){
      var e = M.Combat.enemy(S.sortie);
      $("foe").classList.remove("hidden");
      foe.render(e, { corruption: Math.max(0, 1 - e.hp/e.maxHp) });
    } else $("foe").classList.add("hidden");
  }

  // ---------- master render ----------
  function renderAll(){
    document.body.className = S.phase==="build" ? "baseline" : "diagnostic";
    $("sysline").textContent = S.phase==="build"
      ? "INTERLINKED · V-K · BASELINE 39" : "SYN / DIAGNOSTIC // STREAM OPEN";
    $("rulelabel").textContent = S.phase==="build" ? "DEVIATION | BASELINE" : "DEVIATION | DIAGNOSTIC";
    $("hgname").textContent = S.spec.name+" · "+hex8(S.spec.seed);
    $("hangar").classList.toggle("hidden", S.phase!=="build");
    document.querySelector('[data-intent="DEPLOY"]').classList.toggle("hidden", S.phase!=="build");
    document.querySelector('[data-intent="RETURN"]').classList.toggle("hidden", S.phase!=="deploy");
    document.querySelectorAll("#viewtabs .vt").forEach(function (b){
      b.classList.toggle("on", b.dataset.view===S.view);
    });

    var st = M.computeStats(S.loadout);
    $("datablock").innerHTML = datablock(st);
    renderInbound(st);
    statbars(st);
    renderSlots();
    renderVerbs(st);
    renderPortrait(st);
  }

  // ---------- build intents ----------
  function cyclePart(slot, dir){
    var opts = M.optionsFor(slot);
    var i = (opts.indexOf(S.loadout[slot])+dir+opts.length)%opts.length;
    S.loadout[slot] = opts[i]; S.sel = slot;
    log("› refit "+slot+" → "+M.PARTS[opts[i]].name);
    renderAll();
  }
  function reroll(){
    S.auxSeed = M.rand32();
    log("⟲ aux pattern reseeded → "+hex8(S.auxSeed).slice(0,4));
    renderAll();
  }
  function setChassis(){
    S.spec = M.Chassis.gen(hangar.list[hangar.cur]);
    M.Roster.save(hangar);
  }
  function hgCycle(d){
    hangar.cur = (hangar.cur+d+hangar.list.length)%hangar.list.length;
    setChassis(); log("hangar: "+S.spec.name); renderAll();
  }
  function forge(){
    hangar.list.push(M.rand32()); hangar.cur = hangar.list.length-1;
    setChassis(); log("＋ forged "+S.spec.name+" ["+hex8(S.spec.seed)+"]","now"); renderAll();
  }
  function scrap(){
    if (hangar.list.length<=1){ log("✗ last chassis — cannot scrap.","warn"); return; }
    var old = S.spec.name;
    hangar.list.splice(hangar.cur,1);
    hangar.cur = Math.min(hangar.cur, hangar.list.length-1);
    setChassis(); log("✕ scrapped "+old); renderAll();
  }

  // ---------- deploy loop ----------
  function deploy(){
    S.phase="deploy"; S.heat=0; S.turn=0; S.peeked=false;
    S.broken={}; S.partHp={};
    M.SLOTS.forEach(function (s){ S.partHp[s]=M.PARTS[S.loadout[s]].integrity; });
    S.sortie = M.Combat.newSortie();
    S.tg = M.Combat.telegraph(M.Combat.enemy(S.sortie));
    log("── DEPLOYED. contact: "+M.Combat.enemy(S.sortie).name+" ──","now");
    renderAll();
  }
  function returnToBay(){
    S.phase="build"; S.sortie=null; S.tg=null; S.broken=null; S.partHp=null;
    renderAll();
  }
  function applyDamage(slot, amt){
    S.partHp[slot] = Math.max(0, S.partHp[slot]-amt);
    if (S.partHp[slot]===0 && !S.broken[slot]){
      S.broken[slot] = true;
      if (slot==="TORSO"){ log("██ CORE BREACH — UNIT LOST. ██","bad"); return "dead"; }
      if (slot==="HEAD")  log("█ HEAD OFFLINE — telegraphs dark. █","bad");
      else if (slot==="LEGS") log("█ LEGS OFFLINE — evasion zeroed. █","bad");
      else log("█ "+slot.replace("_"," ")+" OFFLINE — its actions are gone. █","bad");
    }
    return "ok";
  }
  function chooseVerb(id){
    if (S.phase!=="deploy") return;
    var st = M.computeStats(S.loadout);
    var v = M.VERBS[id];
    if (id!=="VENT" && S.heat+v.heat > st.heatCap){
      log("✗ "+v.label+" — no heat headroom. VENT first.","bad"); return;
    }
    var res = M.Combat.resolve(id, S.tg, st, S.loadout, S.broken);
    res.lines.forEach(function (l){ log(l[0], l[1]); });
    if (res.purge) S.heat = 0; else S.heat += res.heatAdd;
    S.peeked = res.peek;

    if (res.taken>0 && applyDamage(res.aim, res.taken)==="dead"){
      log("── sortie failed. frame recovered to bay. ──","bad");
      returnToBay(); return;
    }
    var e = M.Combat.enemy(S.sortie);
    if (res.dmgEnemy>0){
      e.hp -= res.dmgEnemy;
      if (e.hp<=0){
        log("██ "+e.name+" DESTROYED. ██","now");
        S.sortie.idx++;
        if (S.sortie.idx >= S.sortie.queue.length){
          log("── SORTIE COMPLETE — salvage secured. ──","now");
          returnToBay(); return;
        }
        log("── new contact: "+M.Combat.enemy(S.sortie).name+" ──","warn");
      }
    }
    S.turn++;
    S.tg = M.Combat.telegraph(M.Combat.enemy(S.sortie));
    if (S.heat>=st.heatCap) log("! HEAT CRITICAL — VENT or lock out.","warn");
    renderAll();
  }

  // ---------- intent router ----------
  function onIntent(ev){
    switch (ev.type){
      case "SELECT_SLOT": S.sel=ev.slot; renderAll(); break;
      case "CYCLE_PART":  if (S.phase==="build") cyclePart(ev.slot, ev.dir); break;
      case "CHOOSE_VERB": chooseVerb(ev.id); break;
      case "VERB_INDEX":  if (S.phase==="deploy" && M._verbCache[ev.index]) chooseVerb(M._verbCache[ev.index].id); break;
      case "SET_VIEW":    S.view=ev.view; renderAll(); break;
      case "REROLL":      if (S.phase==="build") reroll(); break;
      case "HG_PREV":     if (S.phase==="build") hgCycle(-1); break;
      case "HG_NEXT":     if (S.phase==="build") hgCycle(1); break;
      case "FORGE":       if (S.phase==="build") forge(); break;
      case "SCRAP":       if (S.phase==="build") scrap(); break;
      case "DEPLOY":      if (S.phase==="build") deploy(); break;
      case "RETURN":      if (S.phase==="deploy"){ log("── sortie aborted. ──","warn"); returnToBay(); } break;
    }
  }

  // ---------- boot ----------
  function tickClock(){
    var d = new Date();
    $("clock").textContent = String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
  }
  tickClock(); setInterval(tickClock, 15000);

  new M.Input(document.body, onIntent);
  M.debug = { state:S, intent:onIntent };   // headless test hook
  log("MECHAB diagnostic online.","now");
  log("hangar ◀▶ cycles chassis · +FORGE adds · ⟲AUX restyles weapons.");
  renderAll();
})(window.MECHAB);
