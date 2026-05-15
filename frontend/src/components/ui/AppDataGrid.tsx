import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel, GridSortModel, GridValidRowModel } from "@mui/x-data-grid";
import type { SxProps, Theme } from "@mui/material";

export interface AppDataGridProps<T extends GridValidRowModel> {
    rows: T[];
    columns: GridColDef<T>[];
    getRowId: (row: T) => string | number;
    onRowClick?: (row: T) => void;
    sortModel?: GridSortModel;
    onSortModelChange?: (model: GridSortModel) => void;
    /** Dataset tamamen boş (veri hiç gelmedi) */
    isEmpty?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
    loading?: boolean;
    height?: number | string;
    autoHeight?: boolean;
    /** Satır yüksekliği — varsayılan compact için 36 */
    rowHeight?: number;
    hideFooter?: boolean;
    /** Sunucu taraflı sayfalama */
    paginationMode?: "client" | "server";
    rowCount?: number;
    paginationModel?: GridPaginationModel;
    onPaginationModelChange?: (model: GridPaginationModel) => void;
    sx?: SxProps<Theme>;
}

const EMPTY_SX = {
    borderRadius: 2.5,
    p: 2.25,
    bgcolor: "rgba(247, 245, 241, 0.9)",
    border: "1px solid",
    borderColor: "divider",
    mt: 2,
};

const GRID_SX: SxProps<Theme> = {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2.5,
    mt: 2,
    fontFamily: "inherit",
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeaders": {
        borderBottom: "1px solid",
        borderColor: "divider",
    },
    "& .MuiDataGrid-columnHeader": {
        fontWeight: 800,
        fontSize: "0.75rem",
        color: "text.secondary",
        userSelect: "none",
    },
    "& .MuiDataGrid-sortIcon": {
        opacity: 1,
        color: "text.secondary",
    },
    "& .MuiDataGrid-row": {
        "&:last-child .MuiDataGrid-cell": { borderBottom: 0 },
    },
    "& .MuiDataGrid-row:hover": {
        bgcolor: "action.hover",
    },
    "& .MuiDataGrid-cell": {
        borderBottom: "1px solid",
        borderColor: "divider",
        fontSize: "0.8125rem",
        display: "flex",
        alignItems: "center",
        py: 0.5,
    },
    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
        outline: "none",
    },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
        outline: "none",
    },
    "& .MuiDataGrid-footerContainer": {
        borderTop: "1px solid",
        borderColor: "divider",
        minHeight: 48,
    },
    "& .MuiDataGrid-overlay": {
        bgcolor: "background.paper",
    },
};

export function AppDataGrid<T extends GridValidRowModel>({
    rows,
    columns,
    getRowId,
    onRowClick,
    sortModel,
    onSortModelChange,
    isEmpty = false,
    emptyMessage = "Veri bulunamadı.",
    emptySubMessage,
    loading = false,
    height = 600,
    autoHeight = false,
    rowHeight = 52,
    hideFooter = true,
    paginationMode,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    sx,
}: AppDataGridProps<T>) {
    if (isEmpty && !loading) {
        return (
            <Box sx={EMPTY_SX}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{emptyMessage}</Typography>
                {emptySubMessage ? (
                    <Typography variant="caption" color="text.secondary">{emptySubMessage}</Typography>
                ) : null}
            </Box>
        );
    }

    const containerSx: SxProps<Theme> = autoHeight
        ? { ...GRID_SX, ...sx }
        : { height, ...GRID_SX, ...sx };

    return (
        <DataGrid<T>
            rows={rows}
            columns={columns}
            getRowId={getRowId}
            loading={loading}
            rowHeight={rowHeight}
            density="compact"
            autoHeight={autoHeight}
            hideFooter={hideFooter}
            disableColumnMenu
            disableColumnResize
            disableRowSelectionOnClick
            sortingMode={sortModel !== undefined ? "server" : "client"}
            sortModel={sortModel}
            onSortModelChange={onSortModelChange}
            paginationMode={paginationMode}
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={onPaginationModelChange}
            onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
            sx={containerSx}
            slots={{
                noRowsOverlay: () => (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            {emptyMessage}
                        </Typography>
                    </Box>
                ),
            }}
        />
    );
}
