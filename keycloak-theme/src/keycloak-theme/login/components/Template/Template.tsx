/**
 * This file has been claimed for ownership from @keycloakify/login-ui version 250004.7.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 * 
 * $ npx keycloakify own --path "login/components/Template/Template.tsx" --revert
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { kcSanitize } from "@keycloakify/login-ui/kcSanitize";
import { useInitializeTemplate } from "./useInitializeTemplate";
import { useKcClsx } from "@keycloakify/login-ui/useKcClsx";
import { useI18n } from "../../i18n";
import { useKcContext } from "../../KcContext";
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControl,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography
} from "@mui/material";

export function Template(props: {
    displayInfo?: boolean;
    displayMessage?: boolean;
    displayRequiredFields?: boolean;
    headerNode: ReactNode;
    socialProvidersNode?: ReactNode;
    infoNode?: ReactNode;
    documentTitle?: string;
    bodyClassName?: string;
    children: ReactNode;
}) {
    const {
        displayInfo = false,
        displayMessage = true,
        displayRequiredFields = false,
        headerNode,
        socialProvidersNode = null,
        infoNode = null,
        documentTitle,
        bodyClassName,
        children
    } = props;

    const { kcContext } = useKcContext();

    const { msg, msgStr, currentLanguage, enabledLanguages } = useI18n();

    const { kcClsx } = useKcClsx();

    useEffect(() => {
        document.title =
            documentTitle ?? msgStr("loginTitle", kcContext.realm.displayName || kcContext.realm.name);
    }, [documentTitle, kcContext.realm.displayName, kcContext.realm.name, msgStr]);

    useEffect(() => {
        document.documentElement.className = "fp-keycloak-html";
        document.body.className = `fp-keycloak-body ${bodyClassName ?? ""}`.trim();
    }, [bodyClassName]);

    const { isReadyToRender } = useInitializeTemplate();

    if (!isReadyToRender) {
        return null;
    }

    const auth = kcContext.auth;
    const isShowingAttemptedUsername =
        auth !== undefined && auth.showUsername && !auth.showResetCredentials;

    const subtitle = getSubtitle(kcContext.pageId, msgStr);

    return (
        <Box className={kcClsx("kcLoginClass")} component="main">
            <Paper className={kcClsx("kcFormCardClass")} elevation={0}>
                <Stack spacing={3}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{
                            alignItems: { xs: "flex-start", sm: "center" },
                            justifyContent: "space-between"
                        }}
                    >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box className="fp-auth-logo" aria-hidden="true">
                                FP
                            </Box>
                            <Box>
                                <Typography className="fp-auth-brand" variant="body2">
                                    Finance Portal
                                </Typography>
                                <Typography color="text.secondary" variant="caption">
                                    {msgStr("fpSecureAccess")}
                                </Typography>
                            </Box>
                        </Stack>

                        {enabledLanguages.length > 1 && (
                            <FormControl size="small" className="fp-locale-control">
                                <Select
                                    value={currentLanguage.languageTag}
                                    aria-label={msgStr("languages")}
                                    onChange={event => {
                                        const language = enabledLanguages.find(
                                            ({ languageTag }) => languageTag === event.target.value
                                        );

                                        if (language !== undefined) {
                                            window.location.href = language.href;
                                        }
                                    }}
                                >
                                    {enabledLanguages.map(({ languageTag, label }) => (
                                        <MenuItem key={languageTag} value={languageTag}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Stack>

                    <Stack className={kcClsx("kcFormHeaderClass")} component="header" spacing={1}>
                        <Typography className="fp-auth-overline" variant="overline">
                            {msgStr("fpSecurityOverline")}
                        </Typography>

                        {isShowingAttemptedUsername ? (
                            <Stack id="kc-username" className="fp-attempted-user" spacing={1.25}>
                                <Typography color="text.secondary" variant="caption">
                                    {msg("username")}
                                </Typography>
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                                    <Typography id="kc-attempted-username" variant="subtitle1">
                                        {auth?.attemptedUsername}
                                    </Typography>
                                    <Button
                                        id="reset-login"
                                        href={kcContext.url.loginRestartFlowUrl}
                                        size="small"
                                        variant="outlined"
                                        aria-label={msgStr("restartLoginTooltip")}
                                    >
                                        {msg("restartLoginTooltip")}
                                    </Button>
                                </Stack>
                            </Stack>
                        ) : (
                            <Typography id="kc-page-title" variant="h4">
                                {headerNode}
                            </Typography>
                        )}

                        <Typography color="text.secondary" variant="body2">
                            {subtitle}
                        </Typography>

                        {displayRequiredFields && (
                            <Typography color="text.secondary" variant="caption">
                                <Box component="span" className="required">
                                    *
                                </Box>{" "}
                                {msg("requiredFields")}
                            </Typography>
                        )}
                    </Stack>

                    <Stack id="kc-content" spacing={2.5}>
                        <div id="kc-content-wrapper">
                            {displayMessage &&
                                kcContext.message !== undefined &&
                                (kcContext.message.type !== "warning" ||
                                    !kcContext.isAppInitiatedAction) && (
                                    <Alert
                                        className={kcClsx("kcAlertClass")}
                                        severity={toAlertSeverity(kcContext.message.type)}
                                    >
                                        <span
                                            className={kcClsx("kcAlertTitleClass")}
                                            dangerouslySetInnerHTML={{
                                                __html: kcSanitize(kcContext.message.summary)
                                            }}
                                        />
                                    </Alert>
                                )}

                            <Stack spacing={2.5}>
                                {children}

                                {kcContext.auth !== undefined &&
                                    kcContext.auth.showTryAnotherWayLink && (
                                        <form
                                            id="kc-select-try-another-way-form"
                                            action={kcContext.url.loginAction}
                                            method="post"
                                        >
                                            <input type="hidden" name="tryAnotherWay" value="on" />
                                            <Button
                                                fullWidth
                                                variant="text"
                                                id="try-another-way"
                                                onClick={event => {
                                                    event.preventDefault();
                                                    document.forms[
                                                        "kc-select-try-another-way-form" as never
                                                    ].requestSubmit();
                                                }}
                                            >
                                                {msg("doTryAnotherWay")}
                                            </Button>
                                        </form>
                                    )}

                                {socialProvidersNode}

                                {displayInfo && (
                                    <>
                                        <Divider />
                                        <Box id="kc-info" className={kcClsx("kcSignUpClass")}>
                                            <Box
                                                id="kc-info-wrapper"
                                                className={kcClsx("kcInfoAreaWrapperClass")}
                                            >
                                                {infoNode}
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </div>
                    </Stack>

                    <Divider />

                    <Stack
                        component="footer"
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ justifyContent: "space-between" }}
                    >
                        <Typography color="text.secondary" variant="caption">
                            {msgStr("fpFooterCaption")}
                        </Typography>
                        <Typography color="text.secondary" variant="caption">
                            {new Date().getFullYear()} Finance Portal
                        </Typography>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}

function getSubtitle(pageId: string, msgStr: ReturnType<typeof useI18n>["msgStr"]) {
    switch (pageId) {
        case "register.ftl":
            return msgStr("fpRegisterSubtitle");
        case "login-reset-password.ftl":
            return msgStr("fpResetSubtitle");
        case "login-otp.ftl":
            return msgStr("fpOtpSubtitle");
        case "login-config-totp.ftl":
            return msgStr("fpTotpSetupSubtitle");
        case "login-update-password.ftl":
            return msgStr("fpUpdatePasswordSubtitle");
        case "login-verify-email.ftl":
            return msgStr("fpVerifyEmailSubtitle");
        case "error.ftl":
            return msgStr("fpErrorSubtitle");
        default:
            return msgStr("fpLoginSubtitle");
    }
}

function toAlertSeverity(type: "success" | "warning" | "error" | "info") {
    return type === "error" ? "error" : type;
}
