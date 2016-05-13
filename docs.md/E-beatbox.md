BeatBox
=======

```timbre
var BD, SD, HH1, HH2, CYM, scale, 
    P1, P2, drum, lead, vcf, env, arp, delay, interval;

T("audio").load("../misc/audio/drumkit.wav", function() {
  BD  = this.slice(   0,  500).set({bang:false});
  SD  = this.slice( 500, 1000).set({bang:false});
  HH1 = this.slice(1000, 1500).set({bang:false, mul:0.2});
  HH2 = this.slice(1500, 2000).set({bang:false, mul:0.2});
  CYM = this.slice(2000).set({bang:false, mul:0.2});
  scale = new sc.Scale([0,1,3,7,8], 12, "Pelog");

  P1 = [
    [BD, HH1],
    [HH1],
    [HH2],
    [],
    [BD, SD, HH1],
    [HH1],
    [HH2],
    [SD],
  ].wrapExtend(128);

  P2 = sc.series(16);

  drum = T("lowshelf", {freq:110, gain:8, mul:0.6}, BD, SD, HH1, HH2, CYM).play();
  lead = T("saw", {freq:T("param")});
  vcf  = T("MoogFF", {freq:2400, gain:6, mul:0.1}, lead);
  env  = T("perc", {r:100});
  arp  = T("OscGen", {wave:"sin(15)", env:env, mul:0.5});

  delay = T("delay", {time:"BPM128 L4", fb:0.65, mix:0.35}, 
    T("pan", {pos:0.2}, vcf), 
    T("pan", {pos:T("tri", {freq:"BPM64 L1", mul:0.8}).kr()}, arp)
  ).play();

  interval = T("interval", {interval:"BPM128 L16"}, function(count) {
    var i = count % P1.length;
    if (i === 0) CYM.bang();

    P1[i].forEach(function(p) { p.bang(); });

    if (Math.random() < 0.015) {
      var j = (Math.random() * P1.length)|0;
      P1.wrapSwap(i, j);
      P2.wrapSwap(i, j);
    }

    var noteNum = scale.wrapAt(P2.wrapAt(count)) + 60;
    if (i % 2 === 0) {
      lead.freq.linTo(noteNum.midicps() * 2, "100ms");
    }
    arp.noteOn(noteNum + 24, 60);
  }).start();
});

```

using: [subcollider.js](http://mohayonao.github.com/subcollider.js)

<script src="../src/extras/MoogFF.js"></script>
