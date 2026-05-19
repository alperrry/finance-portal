import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import type { ManualPositionResponse, PortfolioItemResponse, PortfolioInstrumentType, PortfolioResponse } from "../features/portfolio/api/portfolioApi";

type ExportOptions = {
    portfolio: PortfolioResponse;
    manualPositions?: ManualPositionResponse[];
    generatedAt?: Date;
};

type PdfMakeApi = {
    createPdf: (documentDefinition: TDocumentDefinitions) => {
        getBlob: (callback: (blob: Blob) => void) => void;
    };
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
    vfs?: Record<string, string>;
};

const INSTRUMENT_LABELS: Record<PortfolioInstrumentType, string> = {
    STOCK: "Hisse",
    FUND: "Fon",
    CURRENCY: "Döviz",
    BOND: "Tahvil",
    VIOP: "VIOP",
    DEPOSIT: "Mevduat",
};

function toNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null | undefined, digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

function formatQuantity(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(normalized);
}

function formatMoney(value: number | null | undefined, currency = "TRY", digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(normalized);
    } catch {
        return `${formatNumber(normalized, digits)} ${currency}`;
    }
}

function formatPercent(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, 2)}%`;
}

function formatSignedMoney(value: number | null | undefined, currency = "TRY") {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatMoney(normalized, currency)}`;
}

function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function sanitizeFilePart(value: string) {
    const normalized = value
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalized || "portfoy";
}

function metric(label: string, value: string, caption: string): Content {
    return {
        stack: [
            { text: label, style: "metricLabel" },
            { text: value, style: "metricValue" },
            { text: caption, style: "metricCaption" },
        ],
        margin: [0, 0, 0, 8],
    };
}

function primaryCell(text: string): TableCell {
    return { text, style: "primaryCell" };
}

function rightCell(text: string): TableCell {
    return { text, alignment: "right" };
}

function positionName(item: PortfolioItemResponse) {
    return item.instrumentSymbol || item.instrumentName || `${INSTRUMENT_LABELS[item.instrumentType]} #${item.instrumentId}`;
}

function createSummaryMetrics(portfolio: PortfolioResponse): Content {
    return {
        columns: [
            metric("Pozisyon Değeri", formatMoney(portfolio.totalValue, portfolio.displayCurrency), "Bu portföy"),
            metric("Maliyet", formatMoney(portfolio.totalCostBasis, portfolio.displayCurrency), "Toplam maliyet"),
            metric("Kâr/Zarar", formatSignedMoney(portfolio.totalProfitLoss, portfolio.displayCurrency), formatPercent(portfolio.totalProfitLossPct)),
        ],
        columnGap: 14,
        margin: [0, 12, 0, 12],
    };
}

function createPositionsTable(portfolio: PortfolioResponse): Content {
    const items = [...(portfolio.items ?? [])].sort((left, right) => (toNumber(right.currentValue) ?? 0) - (toNumber(left.currentValue) ?? 0));
    if (items.length === 0) {
        return { text: "Bu portföyde henüz pozisyon yok.", style: "emptyText", margin: [0, 2, 0, 14] };
    }

    const body: TableCell[][] = [
        ["Enstrüman", "Tip", "Miktar", "Ort. Maliyet", "Güncel Fiyat", "Güncel Değer", "K/Z", "K/Z %"],
        ...items.map((item) => [
            primaryCell(`${positionName(item)}\n${item.instrumentName ?? ""}`),
            INSTRUMENT_LABELS[item.instrumentType],
            rightCell(formatQuantity(item.quantity)),
            rightCell(formatMoney(item.avgCost, item.nativeCurrency ?? "TRY", 4)),
            rightCell(formatMoney(item.currentPrice, item.nativeCurrency ?? "TRY", 4)),
            rightCell(formatMoney(item.currentValue, portfolio.displayCurrency)),
            rightCell(formatSignedMoney(item.profitLoss, portfolio.displayCurrency)),
            rightCell(formatPercent(item.profitLossPct)),
        ]),
    ];

    return {
        table: {
            headerRows: 1,
            widths: ["*", 42, 48, 62, 62, 62, 62, 42],
            body,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
    };
}

function createAllocationSummary(portfolio: PortfolioResponse): Content {
    const total = toNumber(portfolio.totalValue) ?? 0;
    const rows = [...(portfolio.items ?? [])]
        .map((item) => ({
            name: positionName(item),
            value: toNumber(item.currentValue) ?? 0,
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, 8);

    if (rows.length === 0 || total <= 0) {
        return { text: "Dağılım hesaplamak için pozisyon değeri bulunmuyor.", style: "emptyText", margin: [0, 2, 0, 14] };
    }

    return {
        table: {
            headerRows: 1,
            widths: ["*", 76, 48],
            body: [
                ["Enstrüman", "Değer", "Pay"],
                ...rows.map((row) => [
                    row.name,
                    rightCell(formatMoney(row.value, portfolio.displayCurrency)),
                    rightCell(formatPercent((row.value / total) * 100)),
                ]),
            ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
    };
}

function createManualPositionsSection(positions: ManualPositionResponse[]): Content[] {
    if (!positions.length) return [];

    const byType = new Map<PortfolioInstrumentType, ManualPositionResponse[]>();
    for (const pos of positions) {
        const existing = byType.get(pos.instrumentType) ?? [];
        existing.push(pos);
        byType.set(pos.instrumentType, existing);
    }

    const sections: Content[] = [{ text: "Manuel Pozisyon Defteri", style: "sectionTitle" }];

    for (const [type, rows] of byType) {
        sections.push({ text: INSTRUMENT_LABELS[type], style: "subSectionTitle" });

        const body: TableCell[][] = [
            ["Enstrüman", "Miktar", "Alış Fiy.", "Güncel Fiy.", "Gerç. K/Z", "K/Z %"],
            ...rows.map((pos) => {
                const name = pos.instrumentSymbol ?? pos.bankName ?? pos.instrumentName ?? INSTRUMENT_LABELS[type];
                const pnl = pos.unrealizedPnl ?? pos.realizedPnl;
                return [
                    primaryCell(name),
                    rightCell(formatQuantity(pos.quantity)),
                    rightCell(formatMoney(pos.entryPrice, "TRY", 4)),
                    rightCell(pos.currentPrice != null ? formatMoney(pos.currentPrice, "TRY", 4) : "—"),
                    rightCell(pnl != null ? formatSignedMoney(pnl, "TRY") : "—"),
                    rightCell(pos.pnlPercent != null ? formatPercent(pos.pnlPercent) : "—"),
                ];
            }),
        ];

        sections.push({
            table: { headerRows: 1, widths: ["*", 48, 62, 62, 62, 42], body },
            layout: "lightHorizontalLines",
            margin: [0, 0, 0, 10] as [number, number, number, number],
        });
    }

    return sections;
}

function createDocumentDefinition({ portfolio, manualPositions, generatedAt = new Date() }: ExportOptions): TDocumentDefinitions {
    return {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [32, 42, 32, 34],
        info: {
            title: `${portfolio.name} Portföy Raporu`,
            author: "Kapital",
            subject: "Portföy raporu",
        },
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: "Yatırım tavsiyesi değildir.", alignment: "left" },
                { text: `${currentPage}/${pageCount}`, alignment: "right" },
            ],
            margin: [32, 8, 32, 0],
            style: "footer",
        }),
        content: [
            { text: "Kapital Portföy Raporu", style: "title" },
            {
                columns: [
                    { text: portfolio.name, style: "subtitle" },
                    { text: `Para birimi: ${portfolio.displayCurrency}`, style: "meta", alignment: "right" },
                ],
                margin: [0, 0, 0, 4],
            },
            { text: `Oluşturma zamanı: ${formatDateTime(generatedAt)}`, style: "meta", margin: [0, 0, 0, 8] },
            createSummaryMetrics(portfolio),
            { text: "Pozisyon Dağılımı", style: "sectionTitle" },
            createAllocationSummary(portfolio),
            { text: "Takip Edilen Pozisyonlar", style: "sectionTitle" },
            createPositionsTable(portfolio),
            ...(manualPositions?.length ? createManualPositionsSection(manualPositions) : []),
        ],
        defaultStyle: {
            font: "Roboto",
            fontSize: 8,
            color: "#111111",
        },
        styles: {
            title: { fontSize: 20, bold: true, color: "#111111", margin: [0, 0, 0, 6] },
            subtitle: { fontSize: 13, bold: true, color: "#c1622f" },
            sectionTitle: { fontSize: 12, bold: true, color: "#111111", margin: [0, 10, 0, 6] },
            meta: { fontSize: 8, color: "#666666" },
            metricLabel: { fontSize: 8, color: "#666666" },
            metricValue: { fontSize: 13, bold: true, color: "#111111", margin: [0, 2, 0, 1] },
            metricCaption: { fontSize: 8, color: "#666666" },
            primaryCell: { bold: true },
            subSectionTitle: { fontSize: 10, bold: true, color: "#444444", margin: [0, 6, 0, 4] },
            emptyText: { color: "#666666", italics: true },
            footer: { fontSize: 7, color: "#777777" },
        },
    };
}

export async function exportPortfolioPdf(options: ExportOptions) {
    const [pdfMakeModule, vfsFontsModule] = await Promise.all([
        import("pdfmake/build/pdfmake.js"),
        import("pdfmake/build/vfs_fonts.js"),
    ]);
    const generatedAt = options.generatedAt ?? new Date();
    const datePart = generatedAt.toISOString().slice(0, 10);
    const fileName = `kapital-portfoy-${sanitizeFilePart(options.portfolio.name)}-${datePart}.pdf`;
    const pdfMake = resolvePdfMakeApi(pdfMakeModule);
    const fontVfs = resolveFontVfs(vfsFontsModule);

    if (pdfMake.addVirtualFileSystem) {
        pdfMake.addVirtualFileSystem(fontVfs);
    } else {
        pdfMake.vfs = fontVfs;
    }

    const blob = await createPdfBlob(pdfMake, createDocumentDefinition({ portfolio: options.portfolio, generatedAt }));
    downloadBlob(blob, fileName);
}

function createPdfBlob(pdfMake: PdfMakeApi, documentDefinition: TDocumentDefinitions) {
    return new Promise<Blob>((resolve) => {
        pdfMake.createPdf(documentDefinition).getBlob(resolve);
    });
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resolvePdfMakeApi(module: unknown): PdfMakeApi {
    const candidate = module as Partial<PdfMakeApi> & { default?: Partial<PdfMakeApi> };
    if (isPdfMakeApi(candidate.default)) return candidate.default;
    if (isPdfMakeApi(candidate)) return candidate;
    throw new Error("PDF oluşturucu yüklenemedi.");
}

function isPdfMakeApi(value: unknown): value is PdfMakeApi {
    return typeof (value as Partial<PdfMakeApi> | null)?.createPdf === "function";
}

function resolveFontVfs(module: unknown): Record<string, string> {
    const candidate = module as {
        default?: Record<string, string> | { vfs?: Record<string, string> };
        vfs?: Record<string, string>;
    } & Record<string, unknown>;
    const defaultValue = candidate.default;
    if (candidate.vfs) return candidate.vfs;
    if (hasFontVfs(defaultValue)) return defaultValue.vfs;
    if (defaultValue && Object.keys(defaultValue).length > 0) return defaultValue as Record<string, string>;
    return candidate as Record<string, string>;
}

function hasFontVfs(value: unknown): value is { vfs: Record<string, string> } {
    return typeof value === "object"
        && value !== null
        && "vfs" in value
        && typeof (value as { vfs?: unknown }).vfs === "object"
        && (value as { vfs?: unknown }).vfs !== null;
}
