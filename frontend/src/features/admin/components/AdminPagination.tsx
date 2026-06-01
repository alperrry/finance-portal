import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

interface AdminPaginationProps {
    page: number;
    totalPages: number;
    onPage: (page: number) => void;
}

export function AdminPagination({ page, totalPages, onPage }: AdminPaginationProps) {
    const { t } = useTranslation();
    return (
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.25, p: "16px 22px" }}>
            <Button variant="outlined" size="small" disabled={page <= 0} onClick={() => onPage(page - 1)}>{t("admin.common.prev")}</Button>
            <Typography variant="body2">{totalPages === 0 ? 0 : page + 1} / {totalPages}</Typography>
            <Button variant="outlined" size="small" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => onPage(page + 1)}>{t("admin.common.next")}</Button>
        </Box>
    );
}
