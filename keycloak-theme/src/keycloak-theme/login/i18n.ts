/**
 * This file has been claimed for ownership from @keycloakify/login-ui version 250004.7.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 * 
 * $ npx keycloakify own --path "login/i18n.ts" --revert
 */

import { i18nBuilder } from "@keycloakify/login-ui/i18n";
import type { ThemeName } from "../kc.gen";

/** @see: https://docs.keycloakify.dev/features/i18n */
const { I18nProvider, useI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
        en: {
            fpSecureAccess: "Secure access",
            fpSecurityOverline: "Secure identity",
            fpLoginSubtitle: "Continue with your Finance Portal account.",
            fpRegisterSubtitle: "Create your account with the required identity details.",
            fpResetSubtitle: "Enter your username or email address to receive reset instructions.",
            fpOtpSubtitle: "Confirm your sign-in with the one-time code from your authenticator app.",
            fpTotpSetupSubtitle: "Connect an authenticator app to protect future sign-ins.",
            fpUpdatePasswordSubtitle: "Set a new password to complete the required action.",
            fpVerifyEmailSubtitle: "Verify your email address to continue securely.",
            fpErrorSubtitle: "The requested authentication step could not be completed.",
            fpFooterCaption: "Branded Keycloak access for Finance Portal"
        },
        tr: {
            fpSecureAccess: "Guvenli erisim",
            fpSecurityOverline: "Guvenli kimlik",
            fpLoginSubtitle: "Finance Portal hesabinizla devam edin.",
            fpRegisterSubtitle: "Gerekli kimlik bilgileriyle hesabinizi olusturun.",
            fpResetSubtitle: "Sifirlama yonergeleri icin kullanici adinizi veya e-posta adresinizi girin.",
            fpOtpSubtitle: "Authenticator uygulamanizdaki tek kullanimlik kod ile girisinizi onaylayin.",
            fpTotpSetupSubtitle: "Gelecek girisleri korumak icin authenticator uygulamanizi baglayin.",
            fpUpdatePasswordSubtitle: "Gerekli islemi tamamlamak icin yeni bir sifre belirleyin.",
            fpVerifyEmailSubtitle: "Guvenli devam etmek icin e-posta adresinizi dogrulayin.",
            fpErrorSubtitle: "Istenen kimlik dogrulama adimi tamamlanamadi.",
            fpFooterCaption: "Finance Portal icin markalanmis Keycloak erisimi"
        }
    })
    .build();

export { useI18n, I18nProvider };
