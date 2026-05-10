import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHistoryCompare } from "../api/historyApi";
import type { InstrumentType } from "../api/historyApi";
import { buildComparisonChartData } from "../utils/analysisFormatters";
import type { InstrumentOption } from "../types";

type ComparisonHookInput = {
    comparePanelOpen: boolean;
    comparisonCodes: string[];
    resolvedType: InstrumentType;
    rangeDates: { from: string; to: string };
    instrumentOptions: InstrumentOption[];
};

export function useAnalysisComparison({ comparePanelOpen, comparisonCodes, resolvedType, rangeDates, instrumentOptions }: ComparisonHookInput) {
    const [compareDraftCode, setCompareDraftCode] = useState("");

    const enabled = comparePanelOpen && comparisonCodes.length > 1;

    const compareQuery = useQuery({
        queryKey: ["analysis", "comparison", resolvedType, comparisonCodes, rangeDates.from, rangeDates.to],
        queryFn: () => fetchHistoryCompare(resolvedType, comparisonCodes, rangeDates.from, rangeDates.to),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    const availableCompareOptions = useMemo(
        () => instrumentOptions.filter((option) => !comparisonCodes.includes(option.code)),
        [comparisonCodes, instrumentOptions],
    );

    useEffect(() => {
        if (!comparePanelOpen) return;
        if (availableCompareOptions.some((option) => option.code === compareDraftCode)) return;
        const timer = window.setTimeout(() => setCompareDraftCode(availableCompareOptions[0]?.code ?? ""), 0);
        return () => window.clearTimeout(timer);
    }, [availableCompareOptions, compareDraftCode, comparePanelOpen]);

    const comparisonData = compareQuery.data ?? null;
    const comparisonChart = useMemo(() => buildComparisonChartData(comparisonCodes, comparisonData, instrumentOptions), [comparisonCodes, comparisonData, instrumentOptions]);

    return {
        comparisonLoading: compareQuery.isLoading,
        comparisonError: compareQuery.error ? (compareQuery.error instanceof Error ? compareQuery.error.message : "Karşılaştırma verisi yüklenemedi.") : null,
        comparisonChart,
        availableCompareOptions,
        compareDraftCode,
        setCompareDraftCode,
    };
}
