import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type DataStateProps = {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyLabel?: string;
    children: ReactNode;
};

export function DataState({ loading = false, error = null, empty = false, emptyLabel = "Kayıt bulunamadı.", children }: DataStateProps) {
    if (loading) {
        return (
            <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: 220, gap: 2 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                    Veriler yükleniyor...
                </Typography>
            </Stack>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (empty) {
        return (
            <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                    {emptyLabel}
                </Typography>
            </Box>
        );
    }

    return <>{children}</>;
}
