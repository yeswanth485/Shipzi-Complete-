"use strict";
// =============================================
// SHIPZI — Central TypeScript types
// All field names match the DB schema exactly
// =============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIM_DIVISOR = exports.ZONE_RATE_MAP = void 0;
exports.getZoneRate = getZoneRate;
exports.calcDimWeight = calcDimWeight;
exports.calcShippingCost = calcShippingCost;
// ── Shipping zone cost multipliers ──
exports.ZONE_RATE_MAP = {
    'zone 1': 0.65,
    'zone 2': 0.80,
    'zone 3': 1.00,
    'zone 4': 1.20,
    'zone 5': 1.45,
    'zone 6': 1.70,
    'zone 7': 2.00,
    'zone 8': 2.40,
    'international': 3.50,
    'default': 1.00,
};
function getZoneRate(zone) {
    return exports.ZONE_RATE_MAP[zone.toLowerCase()] ?? exports.ZONE_RATE_MAP['default'];
}
// ── DIM weight calculation (industry standard) ──
exports.DIM_DIVISOR = 5000; // cm³/kg
function calcDimWeight(l, w, h) {
    return parseFloat(((l * w * h) / exports.DIM_DIVISOR).toFixed(3));
}
function calcShippingCost(dimWeightKg, actualWeightKg, zone) {
    const billableWeight = Math.max(dimWeightKg, actualWeightKg);
    const rate = getZoneRate(zone);
    return parseFloat((billableWeight * rate * 0.85).toFixed(2));
}
//# sourceMappingURL=types.js.map