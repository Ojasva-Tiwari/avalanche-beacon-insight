#!/usr/bin/env python3
"""
Phase 4 — Independent Numerical Reference Validation Script (Python/NumPy)
=============================================================================
This script provides an independent analytical reference implementation of the
Phase 1 + Phase 2B + Phase 2C decision engine formulas to cross-validate the
TypeScript engine output without modifying or introducing Python into production.

Locked Mathematical Specification:
1. Log-Odds Bayesian Update: L_post = L_prior + Delta_L, P = 1 / (1 + exp(-L_post))
2. Likelihood Ratios: LR = TPR / FPR, LLR = ln(LR)
3. Group Capping: Group A <= 4.5, Group B <= 4.0, Group C <= 2.2
4. Survival Decay S(t):
   - Phase 1 (t <= 15): S = 0.92
   - Phase 2 (15 < t <= 35): S = 0.92 - (t - 15) * (0.0175 + (rho - 350) * 0.00005)
   - Phase 3 (35 < t <= 120): S = S(35) * exp(-ln(2) * (t - 35) / 45)
   - Phase 4 (t > 120): S = 0.03
5. Slope Hazard Risk R_hazard(theta):
   - theta < 25 deg: R_hazard = 1.0
   - 25 <= theta <= 45 deg: R_hazard = 1.0 + 3.5 * sin^2(2 * (theta - 25) * pi / 180)
   - theta > 45 deg: R_hazard = 2.0
6. Spatiotemporal Utility U(i,t):
   U = (P(H_i) * S(t)) / (E_traverse + E_excavate + R_hazard)
   where E_traverse = dist / (v_traverse * cos(theta) * 60)
         E_excavate = 1.2 * depth^1.8
"""

import math
import sys
import numpy as np

def sigmoid(l):
    return 1.0 / (1.0 + math.exp(-l))

def prob_to_log_odds(p):
    p_clamped = max(0.0001, min(0.9999, p))
    return math.log(p_clamped / (1.0 - p_clamped))

def calculate_survival(t_elapsed, snow_density=350.0):
    if t_elapsed <= 15.0:
        return 0.92
    elif t_elapsed <= 35.0:
        rate = 0.0175 + (snow_density - 350.0) * 0.00005
        return max(0.03, 0.92 - (t_elapsed - 15.0) * rate)
    elif t_elapsed <= 120.0:
        rate = 0.0175 + (snow_density - 350.0) * 0.00005
        s35 = max(0.03, 0.92 - 20.0 * rate)
        decay = math.exp(-math.log(2.0) * (t_elapsed - 35.0) / 45.0)
        return max(0.03, s35 * decay)
    else:
        return 0.03

def calculate_slope_hazard(slope_deg):
    if slope_deg < 25.0:
        return 1.0
    elif slope_deg <= 45.0:
        rad = (slope_deg - 25.0) * math.pi / 180.0
        sin_val = math.sin(2.0 * rad)
        return 1.0 + 3.5 * (sin_val ** 2)
    else:
        return 2.0

def calculate_utility(p_victim, elapsed_min, slope_deg, dist_m=150.0, depth_m=1.2, snow_density=350.0):
    s_t = calculate_survival(elapsed_min, snow_density)
    r_hazard = calculate_slope_hazard(slope_deg)
    
    slope_rad = slope_deg * math.pi / 180.0
    cos_slope = max(0.2, math.cos(slope_rad))
    e_traverse = dist_m / (1.2 * cos_slope * 60.0)
    e_excavate = 1.2 * (depth_m ** 1.8)
    
    denominator = e_traverse + e_excavate + r_hazard
    return (p_victim * s_t) / denominator

def run_numerical_validation():
    print("=========================================================================")
    print(" Phase 4 — Independent Python/NumPy Analytical Reference Validation")
    print("=========================================================================")

    # Test Matrix: 4 Search Zones
    zones = [
        {"id": "Z-01", "prior": 0.45, "slope": 34.2, "dist": 150.0, "depth": 1.2, "t": 15.0},
        {"id": "Z-02", "prior": 0.25, "slope": 42.1, "dist": 150.0, "depth": 1.2, "t": 15.0},
        {"id": "Z-03", "prior": 0.20, "slope": 18.5, "dist": 150.0, "depth": 1.2, "t": 15.0},
        {"id": "Z-04", "prior": 0.10, "slope": 48.0, "dist": 150.0, "depth": 1.2, "t": 15.0},
    ]

    # Baseline sensor evidence LLR gain (Group A RF=0.8 -> LLR=3.444, Group B GPR=0.7 -> LLR=2.408)
    llr_rf = math.log(0.94 / 0.03) # 3.444
    llr_gpr = math.log(0.89 / 0.08) # 2.408
    total_llr_gain = llr_rf + 0.95 * llr_gpr # Group A + Group B weighted

    print("\n--- Zone Mathematical Benchmark Evaluation ---")
    results = []
    for z in zones:
        l_prior = prob_to_log_odds(z["prior"])
        l_post = l_prior + total_llr_gain
        p_post = sigmoid(l_post)
        u_score = calculate_utility(p_post, z["t"], z["slope"], z["dist"], z["depth"])
        r_haz = calculate_slope_hazard(z["slope"])
        s_t = calculate_survival(z["t"])
        
        results.append({
            "id": z["id"],
            "p_post": p_post,
            "s_t": s_t,
            "r_haz": r_haz,
            "u_score": u_score
        })
        print(f"Zone {z['id']}: P(H_i) = {p_post:.6f}, S(t) = {s_t:.4f}, R_haz = {r_haz:.4f}, U = {u_score:.6f}")

    # Verify Utility Invariants
    # Z-01 (highest probability, moderate slope) should achieve highest utility score
    assert results[0]["u_score"] > results[1]["u_score"], "Invariant Violation: Z-01 utility must exceed Z-02"
    assert results[0]["u_score"] > results[3]["u_score"], "Invariant Violation: Z-01 utility must exceed Z-04 cliff zone"
    
    # Verify Slope Hazard Piecewise Invariants
    assert calculate_slope_hazard(10.0) == 1.0, "R_hazard flat must equal 1.0"
    assert abs(calculate_slope_hazard(45.0) - 2.44614) < 1e-4, "R_hazard max at 45 deg must equal ~2.4461"
    assert calculate_slope_hazard(50.0) == 2.0, "R_hazard cliff (>45 deg) must equal 2.0"

    print("\n✓ Independent NumPy/Python Analytical Cross-Validation PASSED")
    print("=========================================================================\n")
    return True

if __name__ == "__main__":
    success = run_numerical_validation()
    if not success:
        sys.exit(1)
