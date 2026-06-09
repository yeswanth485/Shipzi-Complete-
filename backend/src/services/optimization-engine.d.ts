import { ParsedProduct, CatalogBox, OptimizationResult, FitStatus, CSVRow, ValidationResult } from './types';
export declare function validateCSVRow(raw: CSVRow, rowIndex: number): ValidationResult;
export declare function selectOptimalBox(product: ParsedProduct, catalog: CatalogBox[]): OptimizationResult;
export interface BulkResult {
    results: OptimizationResult[];
    invalidRows: Array<{
        rowIndex: number;
        errors: string[];
    }>;
    summary: {
        total: number;
        valid: number;
        invalid: number;
        optimized: number;
        same_box: number;
        no_fit: number;
        total_savings: number;
        avg_utilization: number;
    };
}
export declare function bulkOptimize(rawRows: CSVRow[], catalog: CatalogBox[], onProgress?: (processed: number, total: number) => void): Promise<BulkResult>;
export declare function buildOrderInsertRows(results: OptimizationResult[], runId: string, companyId: string): {
    run_id: string;
    company_id: string;
    product_name: string;
    product_length_cm: number;
    product_width_cm: number;
    product_height_cm: number;
    product_weight_kg: number;
    fragility: string;
    fragility_score: number;
    quantity: number;
    shipping_zone: string;
    used_box_length_cm: number;
    used_box_width_cm: number;
    used_box_height_cm: number;
    used_box_price_usd: number;
    recommended_box_id: string | null;
    original_box_price_usd: number;
    optimized_box_price_usd: number;
    savings_usd: number;
    utilization_pct: number;
    dimensional_weight_kg: number;
    sustainability_score: number;
    fit_status: FitStatus;
    optimization_reason: string;
    ai_explanation: string | null;
    run_row_index: number;
}[];
export declare function chunkArray<T>(arr: T[], size: number): T[][];
//# sourceMappingURL=optimization-engine.d.ts.map