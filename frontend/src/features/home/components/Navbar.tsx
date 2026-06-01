import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../app/auth/AuthContext";

export default function Navbar() {
    const { login, register } = useAuth();
    const { t } = useTranslation();

    return (
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#111111", borderBottom: "1px solid #222" }}>
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
                    Kapital<Box component="span" sx={{ color: "#c1622f" }}>.</Box>
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={login}
                        sx={{ color: "#fff", borderColor: "#444", "&:hover": { borderColor: "#c1622f", bgcolor: "transparent" } }}
                    >
                        {t("auth.login")}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={register}
                        sx={{ bgcolor: "#c1622f", "&:hover": { bgcolor: "#a8512a" } }}
                    >
                        {t("auth.register")}
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
