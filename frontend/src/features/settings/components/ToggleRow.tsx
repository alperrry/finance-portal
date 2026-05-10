import { Box, Divider, Stack, Switch, Typography } from "@mui/material";

type Props = {
    title: string;
    description: string;
    checked: boolean;
    onToggle: () => void;
};

export function ToggleRow({ title, description, checked, onToggle }: Props) {
    return (
        <>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, py: 1.25 }}>
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">{description}</Typography>
                </Box>
                <Switch checked={checked} onChange={onToggle} size="small" />
            </Stack>
            <Divider />
        </>
    );
}
