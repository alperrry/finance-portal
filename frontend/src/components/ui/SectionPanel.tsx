import { Paper, type PaperProps } from "@mui/material";

export function SectionPanel(props: PaperProps) {
    return (
        <Paper
            {...props}
            sx={{
                p: { xs: 2, md: 3 },
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 14px 40px rgba(17, 17, 17, 0.06)",
                ...props.sx,
            }}
        />
    );
}
