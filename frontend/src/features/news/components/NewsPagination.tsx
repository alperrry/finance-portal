import { Box, Pagination, Typography } from "@mui/material";

type Props = {
    pageIndex: number;
    totalPages: number;
    totalElements: number;
    onPageChange: (page: number) => void;
};

export function NewsPagination({ pageIndex, totalPages, totalElements, onPageChange }: Props) {
    if (totalPages <= 1) return null;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, mt: 3 }}>
            <Pagination
                count={totalPages}
                page={pageIndex}
                onChange={(_, page) => onPageChange(page)}
                color="primary"
                shape="rounded"
            />
            <Typography variant="caption" color="text.secondary">
                Toplam {totalElements} haber
            </Typography>
        </Box>
    );
}
