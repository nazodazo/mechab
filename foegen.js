/* foegen.js — procedural hostile sprites. Same tone-grid technique as the
   mech renderer, on its own smaller stage. Each contact = an archetype
   silhouette (hound / spider / knight) + seeded variation, facing LEFT —
   toward your frame. Damage renders as the same corruption language your
   own portrait uses, so a dying enemy visibly falls apart. */

var MECHAB = window.MECHAB || (window.MECHAB = {});

(function (M){
  var FW = 56, FH = 64, SCALE = 5, FCX = 28, FGROUND = 58;

  // hostile palettes — rust, ash, drab. optics run hot.
  var FOE_RAMPS = [
    ["#0f0908","#2e1a12","#4c2c1c","#6b402a","#8a563a"],
    ["#0c0a0e","#231d2a","#3a3145","#524660","#6d5e7e"],
    ["#0d0c09","#26241b","#403c2c","#5a553f","#757053"],
  ];
  var FOE_OPTICS = ["#ff3b30","#ff9f2a","#c8ff4d"];

  var T  = { o:0, d:1, m:2, l:3, h:4, a:5 };   // near tones
  var TF = { o:0, d:1, m:1, l:2, h:2, a:5 };   // far limbs, in shadow

  // ---- tone grid primitives (own stage size) ----
  function makeGrid(){ var t = new Int8Array(FW*FH); t.fill(-1); return t; }
  function set(g,x,y,t){ if(x<0||x>=FW||y<0||y>=FH) return; g[y*FW+x]=t; }
  function get(g,x,y){ return (x<0||x>=FW||y<0||y>=FH) ? -1 : g[y*FW+x]; }
  function rect(g,x,y,w,h,t){ for(var iy=y;iy<y+h;iy++) for(var ix=x;ix<x+w;ix++) set(g,ix,iy,t); }
  function panel(g,x,y,w,h,Tn,round){
    rect(g,x,y,w,h,Tn.m);
    rect(g,x,y,w,1,Tn.l);
    rect(g,x,y+h-1,w,1,Tn.d);
    rect(g,x+w-1,y+1,1,h-2,Tn.d);
    if (w>3 && h>3) rect(g,x+1,y+1,w-2,1,Tn.h);
    if (round){ set(g,x,y,-1); set(g,x+w-1,y,-1); set(g,x,y+h-1,-1); set(g,x+w-1,y+h-1,-1); }
  }
  function limb(g,x0,y0,x1,y1,w,t){
    var steps = Math.max(Math.abs(x1-x0), Math.abs(y1-y0), 1);
    for (var i=0;i<=steps;i++){
      var x = Math.round(x0+(x1-x0)*i/steps), y = Math.round(y0+(y1-y0)*i/steps);
      rect(g,x,y,w,1,t);
    }
  }
  function outline(g){
    var src = new Int8Array(g);
    for (var y=0;y<FH;y++) for (var x=0;x<FW;x++){
      if (src[y*FW+x] < 0) continue;
      if (get(src,x-1,y)<0 || get(src,x+1,y)<0 || get(src,x,y-1)<0 || get(src,x,y+1)<0)
        g[y*FW+x] = 0;
    }
  }

  // ================= HOUND — low quadruped, jaw forward =================
  function drawHound(g, r){
    var bl = 24 + ((r()*10)|0);
    var by = 30 + ((r()*4)|0), bh = 9 + ((r()*3)|0);
    var bx = FCX - (bl>>1);
    // far legs
    [bx+3, bx+bl-9].forEach(function (p){
      limb(g, p+2, by+bh-2, p+4, by+bh+6, 3, TF.m);
      limb(g, p+4, by+bh+6, p+2, FGROUND-2, 3, TF.m);
      rect(g, p+1, FGROUND-2, 6, 2, TF.d);
    });
    // body slab + spine vents
    panel(g, bx, by, bl, bh, T, true);
    for (var i=bx+4; i<bx+bl-4; i+=3) set(g, i, by, T.a);
    // head, lowered, jaw + teeth + optic
    var hw = 9 + ((r()*3)|0);
    panel(g, bx-hw+2, by+2, hw, 7, T, false);
    rect(g, bx-hw+2, by+9, hw-2, 2, T.d);
    for (var j=bx-hw+3; j<bx-1; j+=2) set(g, j, by+9, T.l);
    rect(g, bx-hw+3, by+4, 2, 2, T.a);
    // tail antenna
    limb(g, bx+bl-1, by+1, bx+bl+5, by-6, 1, T.d); set(g, bx+bl+5, by-6, T.a);
    // near legs
    [bx+6, bx+bl-4].forEach(function (p){
      limb(g, p, by+bh-2, p-3, by+bh+7, 3, T.m);
      limb(g, p-3, by+bh+7, p+1, FGROUND-2, 3, T.m);
      panel(g, p-2, FGROUND-3, 7, 3, T, true);
    });
  }

  // ================= SPIDER — dome up high, arched legs =================
  function drawSpider(g, r){
    var dw = 16 + ((r()*6)|0), dy = 20 + ((r()*4)|0), dh = 12 + ((r()*3)|0);
    var dx = FCX - (dw>>1);
    // far legs (right), arched up then planted
    for (var i=0;i<3;i++){
      var ax = dx+dw-3, ay = dy+dh-3;
      var kx = ax+6+i*3, ky = ay-8-((r()*4)|0);
      limb(g, ax, ay, kx, ky, 2, TF.m);
      limb(g, kx, ky, ax+9+i*4, FGROUND-1, 2, TF.m);
    }
    // near legs (left)
    for (var i2=0;i2<3;i2++){
      var ax2 = dx+2, ay2 = dy+dh-3;
      var kx2 = ax2-6-i2*3, ky2 = ay2-9-((r()*4)|0);
      limb(g, ax2, ay2, kx2, ky2, 2, T.m);
      limb(g, kx2, ky2, ax2-9-i2*4, FGROUND-1, 2, T.m);
      rect(g, ax2-10-i2*4, FGROUND-1, 3, 1, T.d);
    }
    // dome — narrows toward the top
    for (var iy=0; iy<dh; iy++){
      var ins = Math.round(3*(1 - iy/(dh-1)));
      rect(g, dx+ins, dy+iy, dw-2*ins, 1, T.m);
    }
    rect(g, dx+3, dy, dw-6, 1, T.l);
    rect(g, dx+1, dy+dh-1, dw-2, 1, T.d);
    // eye cluster on the leading face
    rect(g, dx+2, dy+4, 2, 2, T.a); set(g, dx+5, dy+3, T.a); set(g, dx+5, dy+7, T.a);
    // underslung gun pod, muzzle toward you
    panel(g, dx+2, dy+dh, 8, 4, T, false);
    rect(g, dx-4, dy+dh+1, 6, 2, T.d); set(g, dx-5, dy+dh+1, T.a);
  }

  // ================= KNIGHT — heavy biped, furnace chest =================
  function drawKnight(g, r){
    var tw = 26 + ((r()*8)|0), th = 16 + ((r()*4)|0);
    var tx = FCX - (tw>>1), ty = 18 + ((r()*3)|0);
    var hipY = ty + th;
    // legs
    [FCX-9, FCX+3].forEach(function (p){
      panel(g, p, hipY, 6, FGROUND-2-hipY, T, false);
      rect(g, p, hipY+((FGROUND-2-hipY)>>1), 6, 1, T.d);
      panel(g, p-1, FGROUND-3, 9, 3, T, true);
    });
    // torso + furnace grille
    panel(g, tx, ty, tw, th, T, false);
    for (var fy=ty+5; fy<ty+th-4; fy+=2) rect(g, FCX-4, fy, 8, 1, T.a);
    rect(g, FCX-5, ty+4, 10, 1, T.d); rect(g, FCX-5, ty+th-4, 10, 1, T.d);
    // pauldrons (far one shadowed)
    panel(g, tx-6, ty-2, 9, 8+((r()*3)|0), T, true);
    panel(g, tx+tw-3, ty-2, 9, 8+((r()*3)|0), TF, true);
    // head, slit optic
    panel(g, FCX-3, ty-6, 7, 6, T, false);
    rect(g, FCX-2, ty-4, 4, 1, T.a);
    // hammer arm hanging toward you, glowing edge
    limb(g, tx-3, ty+6, tx-6, ty+16, 3, T.m);
    panel(g, tx-10, ty+16, 8, 7+((r()*3)|0), T, false);
    rect(g, tx-10, ty+18, 2, 3, T.a);
  }

  // ================= renderer =================
  M.FoeRenderer = function (view){
    view.width = FW*SCALE; view.height = FH*SCALE;
    var vctx = view.getContext("2d"); vctx.imageSmoothingEnabled = false;
    var buf = document.createElement("canvas"); buf.width = FW;  buf.height = FH;
    var bctx = buf.getContext("2d");
    var big = document.createElement("canvas"); big.width = view.width; big.height = view.height;
    var gctx = big.getContext("2d"); gctx.imageSmoothingEnabled = false;

    function blit(g, ramp, optic){
      bctx.clearRect(0,0,FW,FH);
      bctx.fillStyle = "rgba(0,0,0,.25)";
      bctx.fillRect(FCX-13, FGROUND, 26, 2); bctx.fillRect(FCX-9, FGROUND+2, 18, 1);
      var colors = [ramp[0],ramp[1],ramp[2],ramp[3],ramp[4],optic];
      for (var y=0;y<FH;y++) for (var x=0;x<FW;x++){
        var t = g[y*FW+x]; if (t<0) continue;
        bctx.fillStyle = colors[t]; bctx.fillRect(x,y,1,1);
      }
    }
    function distort(c){
      c = Math.max(0, Math.min(1, c));
      gctx.clearRect(0,0,big.width,big.height);
      gctx.drawImage(buf, 0,0,FW,FH, 0,0,big.width,big.height);
      var W = view.width, H = view.height, s = M.rng(11 + Math.round(c*997));
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
        for (var j=0, m=Math.floor(c*220); j<m; j++){
          vctx.fillStyle = s()>0.5 ? "rgba(255,77,77,"+(c*0.5)+")" : "rgba(0,0,0,.4)";
          vctx.fillRect(Math.floor(s()*W), Math.floor(s()*H), SCALE*(s()<0.3?1:0.5), 1);
        }
      }
      if (c>0.45){ vctx.fillStyle="rgba(255,60,60,"+((c-0.45)*0.3)+")"; vctx.fillRect(0,0,W,H); }
    }

    return {
      render: function (foe, opts){
        opts = opts || {};
        var g = makeGrid();
        var r = M.rng(foe.seed >>> 0);
        var ramp  = FOE_RAMPS[(r()*FOE_RAMPS.length)|0];
        var optic = FOE_OPTICS[(r()*FOE_OPTICS.length)|0];
        if (foe.arch === "spider")      drawSpider(g, r);
        else if (foe.arch === "knight") drawKnight(g, r);
        else                            drawHound(g, r);
        outline(g);
        blit(g, ramp, optic);
        distort(opts.corruption || 0);
      }
    };
  };
})(window.MECHAB);
