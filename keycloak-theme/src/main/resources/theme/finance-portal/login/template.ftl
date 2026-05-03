<#import "footer.ftl" as loginFooter>

<#macro localeSelect>
    <#if realm.internationalizationEnabled && locale?? && locale.supported?size gt 1>
        <div class="fp-locale-switch">
            <label class="fp-footer-label" for="fp-locale-select">${msg("languages")}</label>
            <div class="fp-locale-select-wrap">
                <select id="fp-locale-select" onchange="if (this.value) window.location.href = this.value;">
                    <#list locale.supported?sort_by("label") as l>
                        <option value="${l.url}" ${(l.languageTag == locale.currentLanguageTag)?then("selected", "")}>
                            ${l.label}
                        </option>
                    </#list>
                </select>
                <span class="fp-locale-select-icon" aria-hidden="true">
                    <svg viewBox="0 0 320 512" fill="currentColor" role="img" width="1em" height="1em">
                        <path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"></path>
                    </svg>
                </span>
            </div>
        </div>
    </#if>
</#macro>

<#macro pageSubtitle>
    <#assign currentPageId = pageId!'login'>
    <#if currentPageId == "login.ftl" || currentPageId == "login">
        ${msg("fpLoginSubtitle")}
    <#elseif currentPageId == "register.ftl">
        ${msg("fpRegisterSubtitle")}
    <#elseif currentPageId == "login-reset-password.ftl">
        ${msg("fpResetSubtitle")}
    <#elseif currentPageId == "login-otp.ftl">
        ${msg("fpOtpSubtitle")}
    <#elseif currentPageId == "login-config-totp.ftl">
        ${msg("fpTotpSetupSubtitle")}
    <#elseif currentPageId == "login-update-password.ftl">
        ${msg("fpUpdatePasswordSubtitle")}
    <#elseif currentPageId == "login-verify-email.ftl">
        ${msg("fpVerifyEmailSubtitle")}
    <#else>
        ${msg("fpErrorSubtitle")}
    </#if>
</#macro>

<#macro usernameSummary>
    <div class="fp-username-summary">
        <div class="fp-username-meta">
            <span class="fp-username-label">${msg("username")}</span>
            <strong id="kc-attempted-username">${auth.attemptedUsername}</strong>
        </div>
        <button
            id="reset-login"
            class="${properties.kcButtonClass!} ${properties.kcButtonSecondaryClass!} fp-inline-button"
            type="button"
            aria-label="${msg('restartLoginTooltip')}"
            onclick="location.href='${url.loginRestartFlowUrl}'"
        >
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            <span>${msg("restartLoginTooltip")}</span>
        </button>
    </div>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang!'tr'}"<#if realm.internationalizationEnabled && locale??> dir="${(locale.rtl)?then('rtl', 'ltr')}"</#if>>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light dark">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(" ") as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>

    <title>${title!}</title>
    <link rel="icon" href="${url.resourcesPath}/img/logo.svg" type="image/svg+xml" />

    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(" ") as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(" ") as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>

    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>

    <#if darkMode!false>
        <script type="module" async blocking="render">
            <#outputformat "JavaScript">
            const DARK_MODE_CLASS = ${properties.kcDarkModeClass?c};
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

            updateDarkMode(mediaQuery.matches);
            mediaQuery.addEventListener("change", (event) => updateDarkMode(event.matches));

            function updateDarkMode(isEnabled) {
                const { classList } = document.documentElement;

                if (isEnabled) {
                    classList.add(DARK_MODE_CLASS);
                } else {
                    classList.remove(DARK_MODE_CLASS);
                }
            }
            </#outputformat>
        </script>
    </#if>

    <#if properties.scripts?has_content>
        <#list properties.scripts?split(" ") as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>

    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from ${(url.resourcesPath + "/js/authChecker.js")?c};

        startSessionPolling(
            ${url.ssoLoginInOtherTabsUrl?c}
        );
        </#outputformat>
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");

            if (!link) {
                return;
            }

            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }

            const { disabledClass } = link.dataset;

            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }

            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession?? && authenticationSession.authSessionIdHash??>
        <script type="module">
            <#outputformat "JavaScript">
            import { checkAuthSession } from ${(url.resourcesPath + "/js/authChecker.js")?c};

            checkAuthSession(
                ${authenticationSession.authSessionIdHash?c}
            );
            </#outputformat>
        </script>
    </#if>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!} fp-body ${bodyClass}" data-page-id="login-${pageId!'unknown'}">
<div class="fp-auth-shell">
    <div class="fp-auth-grid">
        <aside class="fp-brand-panel" aria-label="Finance Portal">
            <div class="fp-brand-wrap">
                <div class="fp-brand-lockup">
                    <img src="${url.resourcesPath}/img/logo.svg" alt="Finance Portal" class="fp-brand-logo" />
                    <div class="fp-brand-copy">
                        <span class="fp-brand-eyebrow">${msg("fpBrandEyebrow")}</span>
                        <h1 class="fp-brand-title">
                            ${msg("fpBrandTitlePrefix")} <em>${msg("fpBrandTitleAccent")}</em>
                        </h1>
                        <p class="fp-brand-body">${msg("fpBrandBody")}</p>
                    </div>
                </div>

                <div class="fp-brand-stats" aria-hidden="true">
                    <div class="fp-brand-stat">
                        <span class="fp-brand-stat-label">${msg("fpBrandStatOneLabel")}</span>
                        <strong>${msg("fpBrandStatOneValue")}</strong>
                    </div>
                    <div class="fp-brand-stat">
                        <span class="fp-brand-stat-label">${msg("fpBrandStatTwoLabel")}</span>
                        <strong>${msg("fpBrandStatTwoValue")}</strong>
                    </div>
                    <div class="fp-brand-stat">
                        <span class="fp-brand-stat-label">${msg("fpBrandStatThreeLabel")}</span>
                        <strong>${msg("fpBrandStatThreeValue")}</strong>
                    </div>
                </div>

                <div class="fp-brand-note">
                    <span class="fp-brand-note-badge">${msg("fpSecurityOverline")}</span>
                    <p>${msg("fpBrandNote")}</p>
                </div>
            </div>
        </aside>

        <main class="fp-auth-main">
            <div class="fp-auth-card">
                <div class="fp-mobile-brand">
                    <img src="${url.resourcesPath}/img/logo.svg" alt="Finance Portal" class="fp-mobile-brand-logo" />
                    <span class="fp-mobile-brand-name">Finance Portal</span>
                </div>

                <header class="fp-auth-header">
                    <span class="fp-auth-overline">${msg("fpSecurityOverline")}</span>
                    <h2 class="fp-auth-title" id="kc-page-title"><#nested "header"></h2>
                    <p class="fp-auth-subtitle"><@pageSubtitle /></p>
                </header>

                <div class="fp-auth-body">
                    <#if displayRequiredFields>
                        <p class="fp-required-note">
                            <span class="required">*</span> ${msg("requiredFields")}
                        </p>
                    </#if>

                    <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
                        <#nested "show-username">
                        <@usernameSummary />
                    </#if>

                    <#if displayMessage && message?has_content && (message.type != "warning" || !isAppInitiatedAction??)>
                        <div class="${properties.kcAlertClass!} fp-alert pf-m-${(message.type = 'error')?then('danger', message.type)}">
                            <div class="${properties.kcAlertIconClass!}">
                                <#if message.type = "success"><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                                <#if message.type = "warning"><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                                <#if message.type = "error"><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                                <#if message.type = "info"><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                            </div>
                            <span class="${properties.kcAlertTitleClass!}">${kcSanitize(message.summary)?no_esc}</span>
                        </div>
                    </#if>

                    <#nested "form">
                </div>

                <footer class="fp-auth-footer">
                    <#if displayInfo>
                        <div id="kc-info" class="fp-auth-info">
                            <#nested "info">
                        </div>
                    </#if>

                    <div class="fp-auth-footer-meta">
                        <@localeSelect />
                        <div class="fp-footer-copy">
                            <span>&copy; ${.now?string("yyyy")} Finance Portal</span>
                            <small>${msg("fpFooterCaption")}</small>
                        </div>
                    </div>

                    <@loginFooter.content/>
                </footer>
            </div>
        </main>
    </div>
</div>
</body>
</html>
</#macro>
