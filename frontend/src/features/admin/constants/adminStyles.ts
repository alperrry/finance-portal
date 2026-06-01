export const PANEL_SX = {
    borderRadius: "22px",
    overflow: "hidden",
    bgcolor: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.92)" : "rgba(247, 245, 241, 0.92)",
    border: "1px solid",
    borderColor: "divider",
    boxShadow: (theme: { palette: { mode: string } }) => theme.palette.mode === "dark" ? "0 18px 52px rgba(0, 0, 0, 0.32)" : "0 18px 52px rgba(17, 17, 17, 0.09)",
};

export const PANEL_HEAD_SX = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    p: "20px 22px",
    borderBottom: "1px solid",
    borderColor: "divider",
} as const;

export const AUDIT_ITEM_SX = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 2,
    px: 2.25,
    py: 1.5,
    borderBottom: "1px solid",
    borderColor: "divider",
    "&:last-child": { borderBottom: 0 },
} as const;