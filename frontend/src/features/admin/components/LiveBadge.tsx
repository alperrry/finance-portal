import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AdminConnectionState } from "../websocket/useAdminWebSocket";

const DOT_COLORS: Record<AdminConnectionState, string> = {
    connected: "#5bb870",
    connecting: "#c1622f",
    reconnecting: "#c1622f",
    offline: "text.disabled",
};

export function LiveBadge({ state }: { state: AdminConnectionState }) {
    const { t } = useTranslation();
    const labels: Record<AdminConnectionState, string> = {
        connecting: t("admin.live.connecting"),
        connected: t("admin.live.live"),
        reconnecting: t("admin.live.reconnecting"),
        offline: t("admin.live.offline"),
    };

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.875,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.7)" : "rgba(255, 255, 255, 0.7)",
                borderRadius: "999px",
                px: 1.375,
                py: 1,
                fontSize: 12,
                fontWeight: 800,
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: DOT_COLORS[state],
                    flexShrink: 0,
                }}
                aria-hidden="true"
            />
            <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit" }}>
                {labels[state]}
            </Typography>
        </Box>
    );
}
