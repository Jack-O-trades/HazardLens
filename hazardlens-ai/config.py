"""
Configuration for HazardLens AI Routing and Scoring.
Adjust these weights to tune the AI's route recommendations.
"""

# --- Traversal Cost Multipliers ---
# Used during Dijkstra pathfinding to calculate edge weights.
COST_NORMAL = 1.0
COST_LOW_ENV_RISK = 2.0
COST_VEGETATION_RISK = 6.0
COST_KNOWN_HAZARD = 1000.0
COST_BLOCKED = float('inf') # Impassable

# --- Visual Environmental Risk Configuration ---
# HSV color ranges to detect "green/vegetation" as a proxy for uncertain terrain risk
# Values are in OpenCV HSV scale (H: 0-179, S: 0-255, V: 0-255)
VISUAL_RISK_LOWER_HSV = (35, 40, 40)
VISUAL_RISK_UPPER_HSV = (85, 255, 255)

# --- Final Route Scoring Weights ---
# Used to normalize and compare the final candidate routes.
WEIGHT_DISTANCE = 0.35
WEIGHT_HAZARD = 0.45
WEIGHT_ENVIRONMENTAL = 0.20

# --- Safety Thresholds ---
MAX_ACCEPTABLE_HAZARD_SCORE = 100.0
MAX_ACCEPTABLE_COMBINED_RISK = 0.85
