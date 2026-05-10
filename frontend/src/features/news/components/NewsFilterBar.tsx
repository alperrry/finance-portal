import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { NewsCategory } from "../api/newsApi";

type Props = {
    categories: NewsCategory[];
    selectedCategoryId: string;
    onCategoryChange: (categoryId: string) => void;
    onRefresh: () => void;
};

export function NewsFilterBar({ categories, selectedCategoryId, onCategoryChange, onRefresh }: Props) {
    const handleChange = (event: SelectChangeEvent) => onCategoryChange(event.target.value);

    return (
        <Stack direction="row" sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="news-category-label">Kategori</InputLabel>
                <Select
                    labelId="news-category-label"
                    id="news-category-filter"
                    value={selectedCategoryId}
                    label="Kategori"
                    onChange={handleChange}
                >
                    <MenuItem value="">Tüm kategoriler</MenuItem>
                    {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={onRefresh}>
                Yenile
            </Button>
        </Stack>
    );
}
