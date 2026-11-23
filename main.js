/* Hello Again — page behaviour: signup form states + the interest -> discovery wires. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Signup = window.HelloAgainSignup;

  // ---------------- Signup forms ----------------
  var MESSAGES = {
    empty: "Add your email to get early access.",
    invalid: "That email doesn't look right. Mind checking it?",
    notConfigured: "Early access opens soon. Signup isn't connected yet, so we haven't saved your email. Please check back shortly.",
    error: "Something went wrong on our side and your email wasn't saved. Please try again in a moment."
  };

  function setStatus(form, text, tone) {
    var el = form.querySelector(".signup__status");
    el.textContent = text || "";
    if (tone) el.setAttribute("data-tone", tone); else el.removeAttribute("data-tone");
  }

  function showSuccess(form, email) {
    var done = document.createElement("div");
    done.className = "signup__done";
    done.setAttribute("role", "status");
    done.setAttribute("tabindex", "-1");
    done.innerHTML =
      '<span class="signup__done-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      "<div><strong>You're on the list.</strong><span></span></div>";
    done.querySelector("span:last-child").textContent = "We'll write to " + email + " when early access opens.";
    form.replaceWith(done);
    done.focus({ preventScroll: true });
  }

  function wire(form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var hp = form.querySelector(".signup__hp");

    input.addEventListener("input", function () {
      if (form.classList.contains("is-invalid")) {
        form.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
        setStatus(form, "");
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-loading")) return;
      var email = input.value.trim();

      if (!email || !Signup.isValidEmail(email)) {
        form.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        setStatus(form, email ? MESSAGES.invalid : MESSAGES.empty, "error");
        input.focus();
        return;
      }
      if (hp && hp.value) return; // bot

      form.classList.add("is-loading");
      button.disabled = true;
      setStatus(form, "");

      Signup.subscribe(email, { source: form.getAttribute("data-source") }).then(function (res) {
        form.classList.remove("is-loading");
        button.disabled = false;
        if (res.status === "subscribed") {
          showSuccess(form, email);
        } else if (res.status === "not_configured") {
          setStatus(form, MESSAGES.notConfigured, "info");
        } else if (res.message === "invalid_email") {
          form.classList.add("is-invalid");
          setStatus(form, MESSAGES.invalid, "error");
        } else {
          setStatus(form, MESSAGES.error, "error");
        }
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-signup]"), wire);

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
