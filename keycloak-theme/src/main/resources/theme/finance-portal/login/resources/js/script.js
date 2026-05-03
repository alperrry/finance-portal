(function () {
  document.documentElement.classList.add("fp-theme-loaded");

  document.addEventListener("input", function (event) {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    if (event.target.id === "otp" || event.target.id === "totp") {
      event.target.value = event.target.value.replace(/\s+/g, "");
    }
  });
})();
