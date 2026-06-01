import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Box, Divider, IconButton, Paper, Typography } from "@mui/material";
import type { AdminEvent } from "../types/admin.types";

function formatEventTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function NotificationBell({
    events,
    unreadCount,
    onOpen,
}: {
    events: AdminEvent[];
    unreadCount: number;
    onOpen: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        setOpen((current) => {
            const next = !current;
            if (next) onOpen();
            return next;
        });
    };

    return (
        <Box sx={{ position: "relative" }}>
            <Badge badgeContent={unreadCount > 9 ? "9+" : unreadCount} color="error" overlap="circular">
                <IconButton
                    type="button"
                    size="small"
                    onClick={toggle}
                    aria-label={t("admin.notifications.ariaLabel")}
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.76)" : "rgba(255, 255, 255, 0.76)",
                        borderRadius: "999px",
                        width: 38,
                        height: 38,
                        color: "secondary.main",
                    }}
                >
                    ●
                </IconButton>
            </Badge>
            {open ? (
                <Paper
                    elevation={6}
                    sx={{
                        position: "absolute",
                        right: 0,
                        top: 46,
                        width: 360,
                        maxWidth: "calc(100vw - 32px)",
                        borderRadius: "18px",
                        p: 1.5,
                        zIndex: 50,
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.25, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{t("admin.notifications.title")}</Typography>
                        <Box component="a" href="/admin/users" sx={{ color: "secondary.main", fontWeight: 800, textDecoration: "none", fontSize: "0.75rem" }}>
                            {t("admin.notifications.seeAll")}
                        </Box>
                    </Box>
                    <Divider sx={{ mb: 1 }} />
                    {events.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>{t("admin.notifications.empty")}</Typography>
                    ) : (
                        events.slice(0, 10).map((event) => (
                            <Box
                                key={event.id}
                                component="article"
                                sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 1.5,
                                    py: 1.5,
                                    px: 0.5,
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                    "&:last-child": { borderBottom: 0 },
                                    bgcolor: event.unread ? "rgba(193, 98, 47, 0.07)" : "transparent",
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.375 }}>{event.description}</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                    {formatEventTime(event.timestamp)}
                                </Typography>
                            </Box>
                        ))
                    )}
                </Paper>
            ) : null}
        </Box>
    );
}
