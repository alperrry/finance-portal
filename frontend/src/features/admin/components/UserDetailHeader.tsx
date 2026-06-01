import { Avatar, Box, Button, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AdminUserListItem } from "../types/admin.types.ts";
import { PANEL_SX } from "../constants/adminStyles.ts";
import { displayName } from "../utils/adminFormatters";

interface UserDetailHeaderProps {
    user: AdminUserListItem;
    onRoleClick: () => void;
    onStatusClick: () => void;
    onReset2FAClick: () => void;
}

export function UserDetailHeader({user,onRoleClick,onStatusClick,onReset2FAClick}:UserDetailHeaderProps){
    const { t } = useTranslation();
    return(
<Paper sx={PANEL_SX}>
    <Box sx={{ p: "22px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 18, fontWeight: 800 }}>
                {displayName(user).slice(0, 2).toLocaleUpperCase("tr-TR")}
            </Avatar>
            <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{displayName(user)}</Typography>
                <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
            </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" size="small" onClick={onRoleClick}>
                {t("admin.userDetail.actions.role")}
            </Button>
            <Button variant="outlined" size="small" onClick={onStatusClick}>
                {t("admin.userDetail.actions.status")}
            </Button>
            <Button variant="contained" color="error" size="small" onClick={onReset2FAClick}>
                {t("admin.userDetail.actions.tfa")}
            </Button>
        </Box>
    </Box>
</Paper>);}
