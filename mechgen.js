/* mechgen.js — chassis-persistent pixel-mech renderer. 64x84 tone grid,
   5-tone ramps + accent, silhouette outline pass, ground shadow.

   The FRAME is drawn from a chassis spec (persistent, rosterable — chassis.js).
   The AUXILIARIES (weapons) are drawn from the loadout + aux seed on top.
   Views: "front" | "side" | "back" | "iso" (3/4). Broken parts render dead. */

var MECHAB = window.MECHAB || (window.MECHAB = {});

(function (M) {
  var GW = 64, GH = 84, SCALE = 5, CX = 32, GROUND = 78;

  // [outline, dark, mid, light, highlight]
  M.RAMPS = [
    ["#0b0d10","#23272e","#3d444d","#5b6570","#7e8a96"], // gunmetal
    ["#100c09","#2c221a","#4a382a","#67503c","#8a6f55"], // bronze
    ["#090d12","#1f2d3a","#33495c","#4c667e","#6b89a3"], // bluesteel
    ["#0b0f0a","#242e1e","#3c4c31","#556845","#71875c"], // olive
    ["#0d0c10","#262230","#403a50","#5b5372","#7a7095"], // violet-steel
  ];
  M.OPTICS = ["#ff6a3d","#ff4d4d","#46d6ff","#7dfca4","#ffcf4d"];

  function mulberry(a){ return function(){
    a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  M.rng = mulberry;   // shared with chassis.js / game.js

  // tone indexes: 0 outline, 1 dark, 2 mid, 3 light, 4 highlight, 5 accent
  var T_OK   = { o:0, d:1, m:2, l:3, h:4, a:5 };
  var T_DEAD = { o:0, d:1, m:1, l:2, h:2, a:1 };  // scorched / offline
  var T_FAR  = { o:0, d:1, m:1, l:2, h:2, a:5 };  // far-side limbs, in shadow

  // ---- tone grid primitives ----
  function makeGrid(){ var t = new Int8Array(GW*GH); t.fill(-1); return t; }
  function set(g,x,y,t){ if(x<0||x>=GW||y<0||y>=GH) return; g[y*GW+x]=t; }
  function get(g,x,y){ return (x<0||x>=GW||y<0||y>=GH) ? -1 : g[y*GW+x]; }
  function rect(g,x,y,w,h,t){ for(var iy=y;iy<y+h;iy++) for(var ix=x;ix<x+w;ix++) set(g,ix,iy,t); }
  function mirX(x,w){ return 2*CX - x - w; }

  // beveled armor panel, lit from above
  function panel(g,x,y,w,h,T,round){
    rect(g,x,y,w,h,T.m);
    rect(g,x,y,w,1,T.l);
    rect(g,x,y+h-1,w,1,T.d);
    rect(g,x+w-1,y+1,1,h-2,T.d);
    if (w>3 && h>3) rect(g,x+1,y+1,w-2,1,T.h);
    if (round){ set(g,x,y,-1); set(g,x+w-1,y,-1); set(g,x,y+h-1,-1); set(g,x+w-1,y+h-1,-1); }
  }
  // stepped thick segment for limbs
  function limb(g,x0,y0,x1,y1,w,t){
    var steps = Math.max(Math.abs(x1-x0), Math.abs(y1-y0), 1);
    for (var i=0;i<=steps;i++){
      var x = Math.round(x0+(x1-x0)*i/steps), y = Math.round(y0+(y1-y0)*i/steps);
      rect(g,x,y,w,1,t);
    }
  }
  // silhouette pass: any filled cell touching empty becomes outline tone
  function outline(g){
    var src = new Int8Array(g);
    for (var y=0;y<GH;y++) for (var x=0;x<GW;x++){
      if (src[y*GW+x] < 0) continue;
      if (get(src,x-1,y)<0 || get(src,x+1,y)<0 || get(src,x,y-1)<0 || get(src,x,y+1)<0)
        g[y*GW+x] = 0;
    }
  }

  function toneSets(broken){
    var Ts = {};
    M.SLOTS.forEach(function(s){ Ts[s] = (broken && broken[s]) ? T_DEAD : T_OK; });
    return Ts;
  }

  // ================= WEAPONS (auxiliaries — loadout + aux rng) =================
  // Front view: weapon hangs vertically beside the forearm.
  function weaponFront(g, id, sgn, hx, hy, T, ar){
    function fx(x){ return sgn<0 ? x : 2*CX-1-x; }   // flip helper for right side
    var len;
    if (id === "arm_auto"){
      len = 8 + ((ar()*4)|0);
      rect(g, fx(hx)- (sgn<0?0:2), hy, 3, len, T.m);
      rect(g, fx(hx)- (sgn<0?0:2), hy, 3, 1, T.l);
      set(g, fx(hx)+(sgn<0?1:-1), hy+len, T.a);                     // muzzle
    } else if (id === "arm_rail"){
      len = 13 + ((ar()*6)|0);
      rect(g, fx(hx)-(sgn<0?0:1), hy, 2, len, T.l);
      rect(g, fx(hx)-(sgn<0?0:1), hy+len-2, 2, 2, T.a);             // charged tip
      rect(g, fx(hx)-(sgn<0?-1:2), hy+2, 1, 4, T.d);                // rail fin
    } else if (id === "arm_saw"){
      len = 9 + ((ar()*4)|0);
      rect(g, fx(hx)-(sgn<0?0:2), hy, 3, len, T.m);
      for (var i=0;i<len;i+=2) set(g, fx(hx)+(sgn<0?3:-3), hy+i, T.l);   // teeth
    } else if (id === "arm_shield"){
      panel(g, sgn<0 ? hx-4 : mirX(hx-4,7), hy-8, 7, 15, T, true);  // big slab
    } else {                                                        // fist
      rect(g, fx(hx)-(sgn<0?0:2), hy, 3, 3, T.d);
    }
  }
  // Side view: weapon held horizontal, pointing right (front).
  function weaponSide(g, id, hx, hy, T, ar){
    var len;
    if (id === "arm_auto"){
      len = Math.min(11 + ((ar()*6)|0), GW-3-hx);
      panel(g, hx-2, hy-2, 6, 5, T, false);                         // receiver
      rect(g, hx+4, hy-1, len, 2, T.m);
      rect(g, hx+4, hy-1, len, 1, T.l);
      set(g, hx+4+len, hy-1, T.a); set(g, hx+4+len, hy, T.a);       // muzzle
    } else if (id === "arm_rail"){
      len = Math.min(16 + ((ar()*8)|0), GW-3-hx);
      rect(g, hx-3, hy-1, 5, 3, T.d);                               // charge block
      rect(g, hx+2, hy, len, 1, T.l);
      rect(g, hx+2, hy-1, len-4, 1, T.d);                           // upper rail
      rect(g, hx+len, hy-1, 2, 3, T.a);                             // tip
    } else if (id === "arm_saw"){
      len = Math.min(10 + ((ar()*5)|0), GW-3-hx);
      rect(g, hx, hy-1, len, 3, T.m);
      for (var i=0;i<len;i+=2) set(g, hx+i, hy+2, T.l);             // teeth below
      rect(g, hx, hy-1, len, 1, T.l);
    } else if (id === "arm_shield"){
      panel(g, hx+5, hy-14, 4, 20, T, true);                        // held forward
    } else {
      rect(g, hx, hy-1, 3, 3, T.d);
    }
  }

  // ================= FRONT / BACK =================
  function drawFrontish(g, sp, fit, ar, Ts, isBack){
    var Tl = Ts.LEGS, Tt = Ts.TORSO, Th = Ts.HEAD;
    var hipY  = GROUND - sp.legLen - 2;
    var kneeY = hipY + (sp.legLen>>1);
    var lx = CX - sp.stance - sp.legW;

    // legs (mirrored)
    [lx, mirX(lx, sp.legW)].forEach(function(x){
      panel(g, x, hipY, sp.legW, kneeY-hipY+1, Tl, false);
      rect (g, x, kneeY+1, sp.legW, 1, Tl.d);                       // knee band
      var sxo = sp.legType===1 ? 1 : sp.legType===2 ? -1 : 0;       // subtle joint hint
      var sx = x + (x < CX ? -sxo : sxo);
      panel(g, sx, kneeY+2, sp.legW, GROUND-3-(kneeY+2), Tl, false);
    });
    [lx-2, mirX(lx-2, sp.legW+4)].forEach(function(x){
      panel(g, x, GROUND-3, sp.legW+4, 3, Tl, true);                // feet
    });

    // hips
    panel(g, CX-sp.stance-1, hipY-3, (sp.stance+1)*2, 4, Tt, false);

    // torso — trapezoid via slope
    var tw = sp.torsoW, th = sp.torsoH, ty = hipY-3-th;
    for (var iy=0; iy<th; iy++){
      var ins = Math.round(sp.slope * (1 - iy/(th-1)));
      rect(g, CX-(tw>>1)+ins, ty+iy, tw-2*ins, 1, Tt.m);
    }
    rect(g, CX-(tw>>1)+sp.slope, ty, tw-2*sp.slope, 1, Tt.l);
    rect(g, CX-(tw>>1)+sp.slope+1, ty+1, tw-2*sp.slope-2, 1, Tt.h);
    rect(g, CX-(tw>>1), ty+th-1, tw, 1, Tt.d);

    if (!isBack){
      panel(g, CX-5, ty+3, 10, 6, Tt, false);                       // chest plate
      set(g,CX-1,ty+5,Tt.a); set(g,CX,ty+5,Tt.a);                   // core light
      set(g,CX-1,ty+6,Tt.a); set(g,CX,ty+6,Tt.a);
    } else {
      // backpack varieties (frame feature)
      if (sp.back===1){                                             // radiator fins
        for (var fy=ty+3; fy<ty+th-3; fy+=2){ rect(g,CX-6,fy,12,1,Tt.d); rect(g,CX-6,fy+1,12,1,Tt.l); }
      } else if (sp.back===2){                                      // twin tanks
        panel(g, CX-(tw>>1)+2, ty+2, 4, th-6, Tt, true);
        panel(g, mirX(CX-(tw>>1)+2, 4), ty+2, 4, th-6, Tt, true);
      } else if (sp.back===3){                                      // antenna array
        rect(g, CX+(tw>>1)-4, ty-9, 1, 9, Tt.d); set(g, CX+(tw>>1)-4, ty-9, Tt.a);
        rect(g, CX+(tw>>1)-7, ty-5, 1, 5, Tt.d);
      } else { panel(g, CX-5, ty+3, 10, 6, Tt, false); rect(g,CX-4,ty+5,8,1,Tt.d); }
    }

    // shoulders + arms + weapons (per side, own tone map for broken state)
    var shy = ty-1, shxL = CX-(tw>>1)-sp.shoW+1;
    [[-1, isBack?"ARM_R":"ARM_L"], [1, isBack?"ARM_L":"ARM_R"]].forEach(function(sd){
      var sgn = sd[0], slot = sd[1], Ta = Ts[slot], pid = fit[slot];
      var ax = sgn<0 ? shxL : mirX(shxL, sp.shoW);
      panel(g, ax, shy, sp.shoW, sp.shoH, Ta, sp.shoRound);
      var jx = sgn<0 ? ax+1 : ax+sp.shoW-4;
      rect(g, jx, shy+sp.shoH, 3, 2, Ta.d);                          // shoulder joint
      panel(g, jx-1, shy+sp.shoH+2, 5, 9, Ta, false);                // forearm
      if (pid && pid !== "arm_none")
        weaponFront(g, pid, sgn, sgn<0? jx-1 : 2*CX-1-(jx+3), shy+sp.shoH+11, Ta, ar);
      else rect(g, jx, shy+sp.shoH+11, 3, 3, Ta.d);                  // fist
    });

    // head
    var hy0 = ty - sp.headH;
    panel(g, CX-(sp.headW>>1), hy0, sp.headW, sp.headH, Th, sp.headType===1);
    if (!isBack){
      if (sp.headType===0) rect(g, CX-(sp.headW>>1)+1, hy0+2, sp.headW-2, 2, Th.a);      // visor
      else if (sp.headType===1) rect(g, CX-1+sp.eyeOff, hy0+2, 2, 2, Th.a);              // mono optic
      else if (sp.headType===2){ rect(g,CX-3,hy0+2,2,2,Th.a); rect(g,CX+1,hy0+2,2,2,Th.a); } // twin
      else { rect(g, CX-1, hy0-4, 1, sp.headH+2, Th.d); set(g, CX-1, hy0-4, Th.a);       // sensor mast
             rect(g, CX-(sp.headW>>1)+1, hy0+2, sp.headW-2, 1, Th.a); }
    } else {
      rect(g, CX-(sp.headW>>1)+1, hy0+2, sp.headW-2, 1, Th.d);       // plain back plate
    }
  }

  // ================= SIDE (facing right) =================
  function drawSide(g, sp, fit, ar, Ts){
    var Tl = Ts.LEGS, Tt = Ts.TORSO, Th = Ts.HEAD, Tw = Ts.ARM_R;
    var hipY  = GROUND - sp.legLen - 2;
    var kneeY = hipY + (sp.legLen>>1);
    var dir = sp.legType===2 ? -3 : sp.legType===1 ? 3 : 0;          // knee fore/aft

    function leg(x0, T){
      limb(g, x0, hipY, x0+dir, kneeY, sp.legW-1, T.m);
      limb(g, x0+dir, kneeY, x0, GROUND-3, sp.legW-1, T.m);
      rect(g, x0+dir, kneeY, sp.legW-1, 1, T.d);                     // knee band
      panel(g, x0-1, GROUND-3, sp.legW+4, 3, T, true);               // foot
    }
    leg(CX-5, Tl===T_DEAD ? T_DEAD : T_FAR);                         // far leg (shadowed)
    leg(CX+1, Tl);                                                   // near leg

    // torso profile (depth), chest slope cut at front-top
    var ty = hipY-3-sp.torsoH, dp = sp.depth;
    panel(g, CX-(dp>>1), ty, dp, sp.torsoH+3, Tt, false);
    for (var i=0;i<sp.slope;i++) for (var j=0;j<sp.slope-i;j++)
      set(g, CX+(dp>>1)-1-j, ty+i, -1);

    // backpack at rear (left edge)
    var bx = CX-(dp>>1)-3;
    if (sp.back===1){ for (var fy=ty+2; fy<ty+sp.torsoH-2; fy+=2){ rect(g,bx,fy,3,1,Tt.d); rect(g,bx,fy+1,3,1,Tt.l); } }
    else if (sp.back===2) panel(g, bx-1, ty+2, 4, sp.torsoH-4, Tt, true);
    else if (sp.back===3){ rect(g, bx+1, ty-8, 1, 10, Tt.d); set(g, bx+1, ty-8, Tt.a); }

    // shoulder (near side, prominent) + arm + weapon
    var sx = CX-(sp.shoW>>1);
    panel(g, sx, ty-1, sp.shoW+1, sp.shoH+1, Tw, sp.shoRound);
    rect (g, sx+2, ty+sp.shoH, 3, 2, Tw.d);
    panel(g, sx+1, ty+sp.shoH+2, 5, 8, Tw, false);
    var pid = fit.ARM_R !== "arm_none" ? fit.ARM_R : fit.ARM_L;      // show the armed side
    if (pid && pid !== "arm_none") weaponSide(g, pid, sx+4, ty+sp.shoH+9, Tw, ar);
    else rect(g, sx+2, ty+sp.shoH+10, 3, 3, Tw.d);

    // head profile — optic at leading edge
    var hy0 = ty - sp.headH;
    panel(g, CX-(sp.headW>>1)+2, hy0, Math.max(5,sp.headW-2), sp.headH, Th, false);
    rect(g, CX+(sp.headW>>1)-2, hy0+2, 2, 2, Th.a);
    if (sp.headType===3){ rect(g, CX, hy0-4, 1, 4, Th.d); set(g, CX, hy0-4, Th.a); }
  }

  // ================= ISO (three-quarter, turned to viewer-right) =================
  // Front face shifted right; the mech's left flank is the visible depth face,
  // so its LEFT shoulder is the near mount. Weapon reads across-forward.
  function drawIso(g, sp, fit, ar, Ts){
    var Tl = Ts.LEGS, Tt = Ts.TORSO, Th = Ts.HEAD;
    var hipY  = GROUND - sp.legLen - 2;
    var kneeY = hipY + (sp.legLen>>1);
    var fw  = Math.max(10, Math.round(sp.torsoW*0.68));  // front face width
    var sw  = Math.max(4,  Math.round(sp.depth*0.55));   // visible flank depth
    var fcx = CX + 4;                                    // front face centre
    var ty  = hipY - 3 - sp.torsoH;
    var Tfar = Tl===T_DEAD ? T_DEAD : T_FAR;

    // far leg (mech's right — behind, up a step)
    var flx = fcx + sp.stance - 2;
    panel(g, flx, hipY-2, sp.legW, kneeY-hipY, Tfar, false);
    panel(g, flx+1, kneeY-1, sp.legW, GROUND-4-(kneeY-1), Tfar, false);
    panel(g, flx, GROUND-5, sp.legW+3, 3, Tfar, true);

    // far shoulder sliver (mech's right)
    panel(g, fcx+(fw>>1)-1, ty-1, 4, sp.shoH, Ts.ARM_R, false);

    // flank (depth face) — in shadow, carries the backpack hint
    var lx = fcx-(fw>>1)-sw;
    rect(g, lx, ty, sw, sp.torsoH, Tt.d);
    rect(g, lx, ty, sw, 1, Tt.m);
    if (sp.back===1){ for (var fy=ty+3; fy<ty+sp.torsoH-3; fy+=2) rect(g, lx, fy, 2, 1, Tt.l); }
    else if (sp.back===2) panel(g, lx-1, ty+2, 3, sp.torsoH-6, Tt, true);
    else if (sp.back===3){ rect(g, lx, ty-7, 1, 8, Tt.d); set(g, lx, ty-7, Tt.a); }

    // torso front face — trapezoid, lit
    for (var iy=0; iy<sp.torsoH; iy++){
      var ins = Math.round(sp.slope * (1 - iy/(sp.torsoH-1)) * 0.7);
      rect(g, fcx-(fw>>1)+ins, ty+iy, fw-2*ins, 1, Tt.m);
    }
    rect(g, fcx-(fw>>1)+1, ty, fw-2, 1, Tt.l);
    rect(g, fcx-(fw>>1)+2, ty+1, fw-4, 1, Tt.h);
    rect(g, fcx-(fw>>1), ty+sp.torsoH-1, fw, 1, Tt.d);
    panel(g, fcx-2, ty+3, 8, 6, Tt, false);              // chest plate
    set(g, fcx+1, ty+5, Tt.a); set(g, fcx+2, ty+5, Tt.a);// core light

    // hips
    panel(g, fcx-sp.stance-1, hipY-3, sp.stance*2+2, 4, Tt, false);

    // near leg (mech's left — front, full tone)
    var nlx = fcx - sp.stance - sp.legW + 1;
    panel(g, nlx, hipY, sp.legW+1, kneeY-hipY+1, Tl, false);
    rect (g, nlx, kneeY+1, sp.legW+1, 1, Tl.d);
    var sxo = sp.legType===1 ? 1 : sp.legType===2 ? -1 : 0;
    panel(g, nlx+sxo, kneeY+2, sp.legW+1, GROUND-3-(kneeY+2), Tl, false);
    panel(g, nlx-1, GROUND-3, sp.legW+5, 3, Tl, true);   // foot, toe leading

    // head — front face + flank sliver
    var hw = Math.max(5, sp.headW-2), hy0 = ty - sp.headH;
    rect(g, fcx-(hw>>1)-2, hy0+1, 2, sp.headH-1, Th.d);
    panel(g, fcx-(hw>>1), hy0, hw, sp.headH, Th, sp.headType===1);
    if (sp.headType===0) rect(g, fcx-(hw>>1)+1, hy0+2, hw-2, 2, Th.a);
    else if (sp.headType===1) rect(g, fcx+sp.eyeOff, hy0+2, 2, 2, Th.a);
    else if (sp.headType===2){ rect(g,fcx-2,hy0+2,2,2,Th.a); rect(g,fcx+2,hy0+2,2,2,Th.a); }
    else { rect(g, fcx-1, hy0-4, 1, sp.headH+2, Th.d); set(g, fcx-1, hy0-4, Th.a);
           rect(g, fcx-(hw>>1)+1, hy0+2, hw-2, 1, Th.a); }

    // near shoulder + arm + weapon (armed side shown, like the side view)
    var slot = fit.ARM_L !== "arm_none" ? "ARM_L" : "ARM_R";
    var pid = fit[slot], Ta = Ts[slot];
    var sx = lx - sp.shoW + 2;
    panel(g, sx, ty-2, sp.shoW+1, sp.shoH+1, Ta, sp.shoRound);
    rect (g, sx+2, ty+sp.shoH-1, 3, 2, Ta.d);
    panel(g, sx+1, ty+sp.shoH+1, 5, 8, Ta, false);
    if (pid && pid !== "arm_none") weaponSide(g, pid, sx+4, ty+sp.shoH+8, Ta, ar);
    else rect(g, sx+2, ty+sp.shoH+9, 3, 3, Ta.d);
  }

  // ================= renderer =================
  M.MechRenderer = function (view){
    view.width = GW*SCALE; view.height = GH*SCALE;
    var vctx = view.getContext("2d"); vctx.imageSmoothingEnabled = false;
    var buf = document.createElement("canvas"); buf.width = GW;  buf.height = GH;
    var bctx = buf.getContext("2d");
    var big = document.createElement("canvas"); big.width = view.width; big.height = view.height;
    var gctx = big.getContext("2d"); gctx.imageSmoothingEnabled = false;

    function blit(g, ramp, optic){
      bctx.clearRect(0,0,GW,GH);
      bctx.fillStyle = "rgba(0,0,0,.25)";                            // ground shadow
      bctx.fillRect(CX-14, GROUND, 28, 2); bctx.fillRect(CX-10, GROUND+2, 20, 1);
      var colors = [ramp[0],ramp[1],ramp[2],ramp[3],ramp[4],optic];
      for (var y=0;y<GH;y++) for (var x=0;x<GW;x++){
        var t = g[y*GW+x]; if (t<0) continue;
        bctx.fillStyle = colors[t]; bctx.fillRect(x,y,1,1);
      }
    }
    function distort(c){
      c = Math.max(0, Math.min(1, c));
      gctx.clearRect(0,0,big.width,big.height);
      gctx.drawImage(buf, 0,0,GW,GH, 0,0,big.width,big.height);
      var W = view.width, H = view.height, s = mulberry(7 + Math.round(c*997));
      vctx.clearRect(0,0,W,H);
      vctx.globalAlpha = 1; vctx.drawImage(big,0,0);
      var split = c*5;
      if (split>0.3){
        vctx.globalCompositeOperation="lighter"; vctx.globalAlpha=.4;
        vctx.drawImage(big,-split,0); vctx.drawImage(big, split,0);
        vctx.globalCompositeOperation="source-over"; vctx.globalAlpha=1;
      }
      for (var i=0, n=Math.floor(c*8); i<n; i++){
        var sy=Math.floor(s()*H), sh=SCALE+Math.floor(s()*SCALE*2), dx=Math.floor((s()-0.5)*c*40);
        vctx.drawImage(big, 0,sy,W,sh, dx,sy,W,sh);
      }
      if (c>0.1){
        for (var j=0, m=Math.floor(c*260); j<m; j++){
          vctx.fillStyle = s()>0.5 ? "rgba(255,77,77,"+(c*0.5)+")" : "rgba(0,0,0,.4)";
          vctx.fillRect(Math.floor(s()*W), Math.floor(s()*H), SCALE*(s()<0.3?1:0.5), 1);
        }
      }
      if (c>0.45){ vctx.fillStyle="rgba(255,60,60,"+((c-0.45)*0.3)+")"; vctx.fillRect(0,0,W,H); }
    }

    return {
      render: function (spec, loadout, auxSeed, viewName, opts){
        opts = opts || {};
        var g  = makeGrid();
        var ar = mulberry((auxSeed ^ spec.seed) >>> 0);
        var Ts = toneSets(opts.broken);
        var fit = { ARM_L: loadout.ARM_L, ARM_R: loadout.ARM_R };
        if (viewName === "side") drawSide(g, spec, fit, ar, Ts);
        else if (viewName === "iso") drawIso(g, spec, fit, ar, Ts);
        else drawFrontish(g, spec, fit, ar, Ts, viewName === "back");
        outline(g);
        blit(g, M.RAMPS[spec.ramp], M.OPTICS[spec.optic]);
        distort(opts.corruption || 0);
      }
    };
  };
})(window.MECHAB);
