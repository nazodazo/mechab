/* input.js — the intent layer. Game logic NEVER reads a raw key or pointer.
   It subscribes to semantic intents. Keyboard satisfies them on desktop; taps
   satisfy the same intents on a phone. Porting to touch = this file, nothing
   else. That's the whole point.

   Intents emitted:
     SELECT_SLOT {slot}      CYCLE_PART {slot, dir}
     CHOOSE_VERB {id}        DEPLOY      RETURN      VENT  */

var MECHAB = window.MECHAB || (window.MECHAB = {});

MECHAB.Input = function (root, handler){
  function emit(type, data){ handler(Object.assign({ type:type }, data||{})); }

  // --- pointer / touch: the UI carries data-* intents; one delegated listener ---
  root.addEventListener("click", function (e){
    var el = e.target.closest("[data-intent],[data-cyc],[data-slot],[data-verb],[data-view]");
    if (!el) return;
    if (el.dataset.verb)   return emit("CHOOSE_VERB", { id: el.dataset.verb });
    if (el.dataset.view)   return emit("SET_VIEW", { view: el.dataset.view });
    if (el.dataset.cyc)    return emit("CYCLE_PART", { slot: el.dataset.slot, dir: +el.dataset.cyc });
    if (el.dataset.slot)   return emit("SELECT_SLOT", { slot: el.dataset.slot });
    if (el.dataset.intent) return emit(el.dataset.intent, {});
  });

  // --- keyboard: a convenience adapter that produces the SAME intents ---
  // (Project Settings analogue: this is the desktop skin over touch-native UI.)
  var order = MECHAB.SLOTS, sel = 0;
  document.addEventListener("keydown", function (e){
    switch (e.key){
      case "ArrowUp":   sel=(sel+order.length-1)%order.length; emit("SELECT_SLOT",{slot:order[sel]}); break;
      case "ArrowDown": sel=(sel+1)%order.length;              emit("SELECT_SLOT",{slot:order[sel]}); break;
      case "ArrowLeft": emit("CYCLE_PART",{slot:order[sel],dir:-1}); break;
      case "ArrowRight":emit("CYCLE_PART",{slot:order[sel],dir:+1}); break;
      case "Enter": case " ": emit("DEPLOY",{}); break;
      case "r": case "R": emit("REROLL",{}); break;
      case "v": case "V": emit("CHOOSE_VERB",{id:"VENT"}); break;
      default:
        if (/^[1-9]$/.test(e.key)) emit("VERB_INDEX",{index:+e.key-1});  // 1-9 pick nth verb in deploy
        else return;
    }
    e.preventDefault();
  });
};
