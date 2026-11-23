/* Signup form behaviour (removed from main.js while signup is not connected). Needs signup.js loaded first. */
(function () {
  "use strict";
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

})();
