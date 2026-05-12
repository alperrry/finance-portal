import { Box, Typography } from "@mui/material";
import type { AdminConnectionState } from "../websocket/useAdminWebSocket";

const LABELS: Record<AdminConnectionState, string> = {
    connecting: "Bağlanıyor",
    connected: "Live",
    reconnecting: "Reconnecting...",
    offline: "Offline",
};

const DOT_COLORS: Record<AdminConnectionState, string> = {
    connected: "#5bb870",
    connecting: "#c1622f",
    reconnecting: "#c1622f",
    offline: "rgba(17,17,17,0.46)",
};

export function LiveBadge({ state }: { state: AdminConnectionState }) {
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.875,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(255, 255, 255, 0.7)",
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
                {LABELS[state]}
            </Typography>
        </Box>
    );
}
