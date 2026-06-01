import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function ForbiddenPage() {
    const { t } = useTranslation();
    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                background: (theme) => theme.palette.mode === "dark" ? "radial-gradient(circle at 14% -12%, rgba(193, 98, 47, 0.1), transparent 42%), #181512" : "radial-gradient(circle at 14% -12%, rgba(193, 98, 47, 0.1), transparent 42%), #edeae4",
                display: "grid",
                placeItems: "center",
                p: 3,
            }}
        >
            <Box sx={{ maxWidth: 420, textAlign: "center" }}>
                <Typography sx={{ color: "secondary.main", fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 800 }}>
                    403
                </Typography>
                <Typography variant="h5" sx={{ mt: 1, fontWeight: 800 }}>{t("admin.forbidden.title")}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
                    {t("admin.forbidden.message")}
                </Typography>
                <Button component={RouterLink} to="/portfolio" variant="contained" color="secondary">
                    {t("admin.forbidden.backButton")}
                </Button>
            </Box>
        </Box>
    );
}
