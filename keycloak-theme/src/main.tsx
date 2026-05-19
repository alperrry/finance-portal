if (window.kcContext !== undefined) {
  import("./keycloak-theme/main");
} else {
  import("./keycloak-theme/main.dev");
}
