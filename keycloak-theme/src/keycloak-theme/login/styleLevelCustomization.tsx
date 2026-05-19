/**
 * This file has been claimed for ownership from @keycloakify/login-ui version 250004.7.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 * 
 * $ npx keycloakify own --path "login/styleLevelCustomization.tsx" --revert
 */

import type { ReactNode } from "react";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import type { ClassKey } from "@keycloakify/login-ui/useKcClsx";
import { kapitalTheme } from "../../theme/kapitalTheme";

type Classes = { [key in ClassKey]?: string };

type StyleLevelCustomization = {
    doUseDefaultCss: boolean;
    classes?: Classes;
    loadCustomStylesheet?: () => void;
    Provider?: (props: { children: ReactNode }) => ReactNode;
};

export function useStyleLevelCustomization(): StyleLevelCustomization {
    return {
        doUseDefaultCss: false,
        classes: {
            kcLoginClass: "fp-auth-shell",
            kcFormCardClass: "fp-auth-card",
            kcFormHeaderClass: "fp-auth-header",
            kcFormGroupClass: "fp-auth-field",
            kcFormClass: "fp-auth-form",
            kcLabelClass: "fp-auth-label",
            kcInputClass: "fp-auth-input",
            kcInputErrorMessageClass: "fp-auth-error",
            kcButtonClass: "fp-auth-button",
            kcButtonPrimaryClass: "fp-auth-button-primary",
            kcButtonSecondaryClass: "fp-auth-button-secondary",
            kcButtonDefaultClass: "fp-auth-button-secondary",
            kcButtonBlockClass: "fp-auth-button-block",
            kcButtonLargeClass: "fp-auth-button-large",
            kcFormOptionsWrapperClass: "fp-auth-options",
            kcFormSettingClass: "fp-auth-settings",
            kcAlertClass: "fp-auth-alert",
            kcAlertTitleClass: "fp-auth-alert-title",
            kcSignUpClass: "fp-auth-info",
            kcInfoAreaWrapperClass: "fp-auth-info-wrapper",
            kcContentWrapperClass: "fp-auth-content-wrapper",
            kcLabelWrapperClass: "fp-auth-label-wrapper"
        },
        Provider: AuthThemeProvider
    };
}

function AuthThemeProvider(props: { children: ReactNode }) {
    const { children } = props;

    return (
        <ThemeProvider theme={kapitalTheme}>
            <CssBaseline />
            <GlobalStyles styles={authGlobalStyles} />
            {children}
        </ThemeProvider>
    );
}

const authGlobalStyles = {
    "@import":
        'url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap")',
    ".fp-keycloak-html, .fp-keycloak-body, #root": {
        minHeight: "100%"
    },
    ".fp-keycloak-body": {
        margin: 0,
        background: "#f7f6f2",
        color: "#111111",
        fontFamily: '"Sora", "Inter", "Roboto", "Helvetica", "Arial", sans-serif'
    },
    ".fp-auth-shell": {
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
            "radial-gradient(circle at 18% -8%, rgba(193, 98, 47, 0.13), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0)) fixed, #f7f6f2"
    },
    ".fp-auth-card": {
        width: "min(100%, 480px)",
        borderRadius: "8px",
        border: "1px solid rgba(193, 98, 47, 0.16)",
        boxShadow: "0 18px 48px rgba(17, 17, 17, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.72) inset",
        backgroundColor: "#ffffff",
        padding: "28px"
    },
    ".fp-auth-logo": {
        width: "42px",
        height: "42px",
        borderRadius: "8px",
        display: "grid",
        placeItems: "center",
        backgroundColor: "#c1622f",
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: 800,
        letterSpacing: 0
    },
    ".fp-auth-brand": {
        fontWeight: 800,
        lineHeight: 1.2
    },
    ".fp-auth-overline": {
        color: "#c1622f",
        fontWeight: 800,
        letterSpacing: 0,
        textTransform: "uppercase"
    },
    ".fp-auth-card h1, .fp-auth-card h2, .fp-auth-card h3, .fp-auth-card h4": {
        letterSpacing: 0,
        fontWeight: 800
    },
    ".fp-auth-field": {
        marginBottom: "16px"
    },
    ".fp-auth-field:last-child": {
        marginBottom: 0
    },
    ".fp-auth-label, .fp-auth-card label": {
        display: "block",
        marginBottom: "8px",
        color: "#111111",
        fontSize: "13px",
        fontWeight: 700
    },
    ".fp-auth-input, .fp-auth-card input[type='text'], .fp-auth-card input[type='password'], .fp-auth-card input[type='email'], .fp-auth-card input[type='number'], .fp-auth-card select, .fp-auth-card textarea": {
        width: "100%",
        minHeight: "42px",
        borderRadius: "8px",
        border: "1px solid rgba(17, 17, 17, 0.18)",
        backgroundColor: "#ffffff",
        color: "#111111",
        font: "inherit",
        fontSize: "14px",
        padding: "10px 12px",
        outline: "none",
        transition: "border-color 160ms ease, box-shadow 160ms ease"
    },
    ".fp-auth-card textarea": {
        minHeight: "88px",
        resize: "vertical"
    },
    ".fp-auth-input:focus, .fp-auth-card input:focus, .fp-auth-card select:focus, .fp-auth-card textarea:focus": {
        borderColor: "#c1622f",
        boxShadow: "0 0 0 4px rgba(193, 98, 47, 0.12)"
    },
    ".fp-password-field": {
        position: "relative"
    },
    ".fp-password-field .fp-auth-input, .fp-password-field input[type='password'], .fp-password-field input[type='text']": {
        paddingRight: "46px"
    },
    ".fp-password-toggle, .fp-auth-card .fp-password-toggle": {
        position: "absolute",
        top: "50%",
        right: "6px",
        transform: "translateY(-50%)",
        width: "34px",
        height: "34px",
        minHeight: "34px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        borderRadius: "8px",
        padding: 0,
        backgroundColor: "transparent",
        color: "rgba(17, 17, 17, 0.58)",
        cursor: "pointer",
        transition: "background-color 160ms ease, color 160ms ease"
    },
    ".fp-password-toggle:hover, .fp-auth-card .fp-password-toggle:hover": {
        backgroundColor: "rgba(193, 98, 47, 0.1)",
        color: "#c1622f"
    },
    ".fp-password-toggle:focus-visible, .fp-auth-card .fp-password-toggle:focus-visible": {
        outline: "none",
        boxShadow: "0 0 0 3px rgba(193, 98, 47, 0.16)"
    },
    ".fp-auth-card input[aria-invalid='true'], .fp-auth-card .pf-m-error input": {
        borderColor: "#c84b4b"
    },
    ".fp-auth-error": {
        display: "block",
        marginTop: "7px",
        color: "#c84b4b",
        fontSize: "12px",
        lineHeight: 1.45
    },
    ".fp-auth-settings": {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginTop: "-2px"
    },
    ".fp-auth-settings .checkbox label": {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        margin: 0,
        color: "rgba(17, 17, 17, 0.68)",
        fontWeight: 600
    },
    ".fp-auth-card input[type='checkbox']": {
        width: "16px",
        height: "16px",
        accentColor: "#111111"
    },
    ".fp-auth-options a, .fp-auth-card a": {
        color: "#c1622f",
        fontWeight: 700,
        textDecoration: "none"
    },
    ".fp-auth-options a:hover, .fp-auth-card a:hover": {
        textDecoration: "underline"
    },
    ".fp-auth-button, .fp-auth-card input[type='submit'], .fp-auth-card input[type='button'], .fp-auth-card button": {
        minHeight: "42px",
        borderRadius: "8px",
        border: "1px solid rgba(17, 17, 17, 0.14)",
        cursor: "pointer",
        font: "inherit",
        fontWeight: 800,
        letterSpacing: 0,
        padding: "10px 16px",
        transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease"
    },
    ".fp-auth-button-block, .fp-auth-card input[type='submit'], .fp-auth-card input[type='button']": {
        width: "100%"
    },
    ".fp-auth-button-primary, .fp-auth-card input[type='submit']": {
        backgroundColor: "#c1622f",
        borderColor: "#c1622f",
        color: "#ffffff"
    },
    ".fp-auth-button-primary:hover, .fp-auth-card input[type='submit']:hover": {
        backgroundColor: "#a8512a",
        borderColor: "#a8512a"
    },
    ".fp-auth-button-secondary, .fp-auth-card input[type='button'], .fp-auth-card button:not(.MuiButtonBase-root)": {
        backgroundColor: "#ffffff",
        color: "#111111"
    },
    ".fp-auth-button:disabled, .fp-auth-card input:disabled, .fp-auth-card button:disabled": {
        cursor: "not-allowed",
        opacity: 0.58
    },
    ".fp-auth-alert": {
        marginBottom: "18px",
        borderRadius: "8px"
    },
    ".fp-auth-info-wrapper": {
        color: "rgba(17, 17, 17, 0.68)",
        fontSize: "14px",
        lineHeight: 1.6,
        textAlign: "center"
    },
    ".fp-attempted-user": {
        border: "1px solid rgba(17, 17, 17, 0.1)",
        borderRadius: "8px",
        padding: "12px"
    },
    ".fp-locale-control": {
        minWidth: "128px"
    },
    ".fp-step-list": {
        margin: "0 0 18px",
        paddingLeft: "20px",
        color: "rgba(17, 17, 17, 0.72)",
        lineHeight: 1.6
    },
    "#kc-totp-secret-qr-code": {
        display: "block",
        width: "180px",
        height: "180px",
        margin: "12px auto",
        border: "1px solid rgba(17, 17, 17, 0.12)",
        borderRadius: "8px"
    },
    ".required": {
        color: "#c84b4b",
        fontWeight: 800
    },
    "@media (max-width: 600px)": {
        ".fp-auth-shell": {
            alignItems: "stretch",
            padding: "12px"
        },
        ".fp-auth-card": {
            width: "100%",
            padding: "22px"
        },
        ".fp-auth-settings": {
            alignItems: "flex-start",
            flexDirection: "column"
        }
    }
};
