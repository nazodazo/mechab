/* chassis.js — persistent, rosterable chassis. The seed IS the chassis
   (Minecraft-world style): same seed always regenerates the same frame spec,
   so the hangar only stores integers. The frame is what stays fixed during a
   session; auxiliaries reroll on top of it. */

var MECHAB = window.MECHAB || (window.MECHAB = {});

(function (M) {
  var WORDS = ["ATLAS","HALBERD","ONAGER","VESPER","TALOS","MULE","PIKE",
               "CAIRN","BRUTE","HERON","GLAIVE","SEXTON","BODKIN","FERRUM"];

  function name(seed){
    var r = M.rng((seed ^ 0x9e3779b9) >>> 0);
    return String.fromCharCode(65+((r()*26)|0)) + String.fromCharCode(65+((r()*26)|0))
         + "-" + (1+((r()*9)|0)) + " " + WORDS[(r()*WORDS.length)|0];
  }

  M.Chassis = {
    gen: function (seed){
      seed = seed >>> 0;
      var r = M.rng(seed);
      return {
        seed: seed, name: name(seed),
        ramp:   (r()*M.RAMPS.length)|0,
        optic:  (r()*M.OPTICS.length)|0,
        legType:(r()*3)|0,                       // 0 straight | 1 digitigrade | 2 reverse
        legLen: 14+((r()*6)|0), legW: 4+((r()*2)|0), stance: 7+((r()*3)|0),
        torsoW: 18+((r()*8)|0), torsoH: 15+((r()*6)|0), slope: (r()*4)|0,
        shoW: 6+((r()*4)|0), shoH: 6+((r()*4)|0), shoRound: r()<0.5,
        headType:(r()*4)|0,                      // visor | mono | twin | sensor mast
        headW: 6+((r()*4)|0), headH: 5+((r()*3)|0), eyeOff: ((r()*3)|0)-1,
        back:  (r()*4)|0,                        // plain | radiator | tanks | antenna
        depth: 12+((r()*6)|0),
      };
    },
  };

  var KEY = "mechab.hangar";
  M.Roster = {
    load: function (){
      try {
        var j = JSON.parse(localStorage.getItem(KEY));
        if (j && j.list && j.list.length) return j;
      } catch (e) {}
      // fresh hangar: three forged starters
      var st = { list: [rand32(), rand32(), rand32()], cur: 0 };
      this.save(st);
      return st;
    },
    save: function (st){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} },
  };
  function rand32(){ return (Math.random()*0xffffffff) >>> 0; }
  M.rand32 = rand32;
})(window.MECHAB);
