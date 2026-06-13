export interface CSVRow {
    product_name: string;
    product_length: string;
    product_width: string;
    product_height: string;
    used_box_length: string;
    used_box_width: string;
    used_box_height: string;
    fragility_score: string;
    used_box_price: string;
    shipping_zone: string;
    quantity?: string;
    weight_kg?: string;
}
export interface ParsedProduct {
    product_name: string;
    product_length: number;
    product_width: number;
    product_height: number;
    used_box_length: number;
    used_box_width: number;
    used_box_height: number;
    fragility_score: number;
    used_box_price: number;
    shipping_zone: string;
    quantity: number;
    weight_kg: number;
    row_index: number;
}
export interface CatalogBox {
    id: string;
    company_id: string;
    box_name: string;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    max_weight_kg: number;
    material_type: string;
    cost_per_box_usd: number;
    sustainability_score: number;
    is_active: boolean;
}
export type FitStatus = 'optimized' | 'same_box' | 'no_fit' | 'error';
export interface OptimizationResult {
    row_index: number;
    product_name: string;
    original_box_dimensions: string;
    original_box_price: number;
    optimized_box_dimensions: string;
    optimized_box_price: number;
    recommended_box_id: string | null;
    recommended_box_name: string;
    shipping_zone: string;
    savings: number;
    fit_status: FitStatus;
    optimization_reason: string;
    utilization_pct: number;
    dimensional_weight_kg: number;
    sustainability_score: number;
    ai_explanation?: string;
    parsed_product: ParsedProduct;
    recommended_box: CatalogBox | null;
    error_message?: string;
}
export interface RunSummary {
    total_rows: number;
    optimized: number;
    same_box: number;
    no_fit: number;
    errors: number;
    total_savings: number;
    avg_utilization: number;
    run_id: string;
}
export interface OptimizedOrderRow {
    id: string;
    run_id: string | null;
    company_id: string;
    product_name: string;
    product_length_cm: number | null;
    product_width_cm: number | null;
    product_height_cm: number | null;
    product_weight_kg: number | null;
    fragility: string | null;
    fragility_score: number | null;
    quantity: number | null;
    shipping_zone: string | null;
    used_box_length_cm: number | null;
    used_box_width_cm: number | null;
    used_box_height_cm: number | null;
    used_box_price_usd: number | null;
    recommended_box_id: string | null;
    current_box_id: string | null;
    original_box_price_usd: number | null;
    optimized_box_price_usd: number | null;
    savings_usd: number | null;
    shipping_cost_usd: number | null;
    utilization_pct: number | null;
    dimensional_weight_kg: number | null;
    sustainability_impact: string | null;
    sustainability_score: number | null;
    fit_status: string | null;
    optimization_reason: string | null;
    ai_explanation: string | null;
    run_row_index: number | null;
    created_at: string;
    recommended_box?: CatalogBox | null;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    row: ParsedProduct | null;
}
export declare const ZONE_RATE_MAP: Record<string, number>;
export declare function getZoneRate(zone: string): number;
export declare const DIM_DIVISOR = 5000;
export declare function calcDimWeight(l: number, w: number, h: number): number;
export declare function calcShippingCost(dimWeightKg: number, actualWeightKg: number, zone: string): number;
//# sourceMappingURL=types.d.ts.map