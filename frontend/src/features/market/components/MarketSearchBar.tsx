import { Chip, Stack, TextField } from "@mui/material";
import { formatWholeNumber } from "../utils/marketFormatters";

type Props = {
    query: string;
    onQueryChange: (value: string) => void;
    placeholder: string;
    visibleCount: number;
    totalCount: number;
    datasetDate: string;
};

export function MarketSearchBar({ query, onQueryChange, placeholder, visibleCount, totalCount, datasetDate }: Props) {
    return (
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
                id="market-search"
                type="search"
                value={query}
                placeholder={placeholder}
                onChange={(event) => onQueryChange(event.target.value)}
                label="Ara"
            />
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Chip label={`${formatWholeNumber(visibleCount)} / ${formatWholeNumber(totalCount)} kayıt`} />
                <Chip variant="outlined" label={`Veri tarihi ${datasetDate}`} />
            </Stack>
        </Stack>
    );
}
