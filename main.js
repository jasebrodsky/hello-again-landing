/* Hello Again — page behaviour: the interest -> discovery wires. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------- Wires between interests and discoveries ----------------
  var NS = "http://www.w3.org/2000/svg";
  var wrap = document.querySelector(".links-wrap");
  var svg = wrap && wrap.querySelector(".wires");
  if (!svg) return;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // Draws during page load animate in; later redraws (resize, rotation) render settled.
  var animateUntil = Date.now() + 700;
  function draw() {
    svg.classList.toggle("is-settled", Date.now() > animateUntil);
    var box = wrap.getBoundingClientRect();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);

    var defs = el("defs", {});
    // userSpaceOnUse so perfectly horizontal wires (zero-height bbox) still paint.
    var grad = el("linearGradient", { id: "wireGrad", gradientUnits: "userSpaceOnUse", x1: "0", y1: "0", x2: String(box.width), y2: "0" });
    grad.appendChild(el("stop", { offset: "0.15", "stop-color": "#FF3366", "stop-opacity": "0.95" }));
    grad.appendChild(el("stop", { offset: "0.75", "stop-color": "#FF3366", "stop-opacity": "0.4" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    Array.prototype.forEach.call(wrap.querySelectorAll(".link"), function (li, i) {
      var c = li.querySelector(".chip").getBoundingClientRect();
      var d = li.querySelector(".card").getBoundingClientRect();
      var x1 = c.right - box.left, y1 = c.top + c.height / 2 - box.top;
      var x2 = d.left - box.left, y2 = d.top + d.height / 2 - box.top;
      var dx = Math.max(16, (x2 - x1) * 0.5);
      var dPath = "M" + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + " " + (x2 - dx) + " " + y2 + " " + x2 + " " + y2;
      var path = el("path", { d: dPath, class: "wire", style: "--i:" + i });
      svg.appendChild(path);
      var len = path.getTotalLength();
      path.style.setProperty("--len", Math.ceil(len));
      svg.appendChild(el("circle", { cx: x2, cy: y2, r: 3, class: "node" }));

      if (!reduceMotion) {
        var spark = el("circle", { r: 2.2, class: "spark", style: "--i:" + i });
        var anim = el("animateMotion", {
          dur: (3.2 + i * 0.45) + "s", repeatCount: "indefinite", path: dPath,
          begin: (1.6 + i * 0.3) + "s", keyPoints: "0;1", keyTimes: "0;1", calcMode: "linear"
        });
        spark.appendChild(anim);
        svg.appendChild(spark);
      }

      li.onmouseenter = function () { path.classList.add("is-hot"); };
      li.onmouseleave = function () { path.classList.remove("is-hot"); };
    });
  }

  var raf;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  schedule();
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(wrap);
})();
