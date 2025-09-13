# Health Index V2 - Percentage-Based Calculation Engine

## Overview

This document describes the new Health Index calculation system (V2) that replaces the legacy rule-based approach with a modern percentage-based calculation engine. The new system provides better flexibility, removes dangerous eval() usage, and allows admin configuration without code changes.

## Key Features

- **Percentage-based calculation**: Simple, understandable deviation percentages
- **No eval() usage**: Secure, structured combination rules
- **Admin UI configuration**: Change parameters and rules without code deployment
- **Audit trail**: Complete history of configuration changes
- **Backward compatibility**: Automatic fallback to legacy calculation if V2 not configured
- **Gender-aware**: Respects gender-specific reference ranges
- **0-1000 scale maintained**: Consistent with existing system

## Database Schema

### 1. health_index_parameters
Stores configuration for parameters included in Health Index calculation.

```sql
CREATE TABLE health_index_parameters (
  id SERIAL PRIMARY KEY,
  parameter_id VARCHAR NOT NULL UNIQUE REFERENCES parameter_master(parameter_id),
  include_in_index BOOLEAN DEFAULT true,
  direction VARCHAR(20) CHECK (direction IN ('high_bad','low_bad','two_sided')),
  pmax NUMERIC(6,2) DEFAULT 75,      -- max penalty points
  k_full NUMERIC(4,3) DEFAULT 0.25,  -- % deviation for full penalty
  weight NUMERIC(4,2) DEFAULT 1.0,   -- multiplier
  is_active BOOLEAN DEFAULT true
);
```

### 2. health_index_combinations
Stores combination penalty rules.

```sql
CREATE TABLE health_index_combinations (
  id SERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL,
  members JSONB NOT NULL,  -- {"parameter_ids": ["P110","P002","P006"]}
  trigger_type VARCHAR(20) CHECK (trigger_type IN ('all_out','any_two','avg_dev_ge_t')),
  trigger_threshold NUMERIC(4,2),  -- for avg_dev_ge_t trigger
  cmax NUMERIC(6,2) NOT NULL,      -- max combination penalty
  scale_by_avg BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);
```

### 3. health_index_config_audit
Audit trail for all configuration changes.

```sql
CREATE TABLE health_index_config_audit (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Calculation Logic

### 1. Parameter Penalties
For each active parameter with include_in_index=true:

```javascript
// Calculate deviation percentage
deviation = calculateDeviation(value, refMin, refMax, direction)

// Where:
// high_bad: deviation = max(0, (value - refMax) / refMax)
// low_bad: deviation = max(0, (refMin - value) / refMin)  
// two_sided: deviation based on which side is violated

// Calculate penalty
penalty = weight * pmax * min(1, deviation / k_full)
```

### 2. Combination Penalties
For each active combination rule:

```javascript
// Check trigger condition
if (trigger_type === 'all_out') {
  triggered = all_members_have_deviation > 0
} else if (trigger_type === 'any_two') {
  triggered = at_least_2_members_have_deviation > 0
} else if (trigger_type === 'avg_dev_ge_t') {
  triggered = average_severity >= trigger_threshold
}

// Apply penalty
if (triggered) {
  if (scale_by_avg) {
    penalty = cmax * average_severity
  } else {
    penalty = cmax
  }
}
```

### 3. Final Score
```
Total Penalty = Sum(parameter penalties) + Sum(combination penalties)
Health Score = max(0, 1000 - Total Penalty)
```

## Default Configuration

### Parameters (9 defaults)
- P001: HbA1c (high_bad)
- P002: Fasting Glucose (high_bad)
- P003: Total Cholesterol (high_bad)
- P004: LDL (high_bad)
- P005: HDL (low_bad)
- P006: Triglycerides (high_bad)
- P110: BMI (high_bad)
- P111: CRP (high_bad)
- URIC_001: Uric Acid (high_bad)

All with: pmax=75, k_full=0.25, weight=1.0

### Combinations (3 defaults)
1. **Metabolic Risk**: BMI + Fasting Glucose + Triglycerides (all_out, 60 pts)
2. **Inflammatory Risk**: CRP + HbA1c (all_out, 40 pts)
3. **Cardiovascular Risk**: LDL + HDL + Total Cholesterol (all_out, 75 pts)

## Safety Flags

Critical thresholds that trigger immediate alerts:
- CRP > 50 mg/L
- HbA1c ≥ 10%
- Fasting Glucose ≥ 250 mg/dL
- LDL ≥ 250 mg/dL
- Health Score < 400

## Installation & Setup

### 1. Run Database Migration
```bash
cd server/scripts
node runHealthIndexMigration.js
```

### 2. Verify Installation
The migration script will:
- Create all necessary tables
- Add indexes and constraints
- Seed default parameters and combinations
- Set up audit triggers

### 3. Configure in Admin UI
1. Login to Admin Portal
2. Navigate to "Health Index" tab
3. Configure parameters and combination rules as needed

## Migration from Legacy System

### Option A: Recalculate All Reports
```bash
cd server/scripts
node recalculateHealthScores.js [--batch-size=500] [--dry-run]
```

### Option B: Fresh Start
Simply start using the new calculation for new reports. Old reports retain their original scores.

## API Endpoints

### Configuration Management
```
GET    /api/admin/health-index/parameters
PUT    /api/admin/health-index/parameters/:id
GET    /api/admin/health-index/combinations
POST   /api/admin/health-index/combinations
PUT    /api/admin/health-index/combinations/:id
DELETE /api/admin/health-index/combinations/:id
GET    /api/admin/health-index/audit
```

## Score Breakdown Structure

Each report stores detailed calculation breakdown:

```json
{
  "parameterPenalties": [
    {
      "parameterId": "P001",
      "parameterKey": "HbA1c",
      "value": 7.5,
      "unit": "%",
      "refMin": 4,
      "refMax": 5.6,
      "direction": "high_bad",
      "deviation": 33.93,
      "severity": 1,
      "penalty": 75
    }
  ],
  "combinationPenalties": [
    {
      "ruleName": "Metabolic Risk",
      "memberIds": ["P110", "P002", "P006"],
      "triggerType": "all_out",
      "avgSeverity": 0.65,
      "penalty": 60
    }
  ],
  "totalPenalty": 135,
  "completeness": 0.89,
  "safetyFlags": [],
  "confidence": "Normal",
  "timestamp": "2025-08-09T10:30:00Z"
}
```

## Testing

The system includes comprehensive validation:
- On-limit values produce zero penalty
- Penalties are capped at configured maximums
- Missing values are handled gracefully
- Completeness < 60% triggers "Low Confidence" flag
- Gender-specific ranges fall back to defaults when not available

## Monitoring

Monitor these key metrics:
- Average health scores by company
- Parameter penalty distributions
- Combination rule trigger frequencies
- Configuration change frequency
- Calculation performance (should be <100ms per report)

## Security Considerations

- No eval() usage - all rules are data-driven
- Audit trail captures all changes with user identification
- Parameter validation prevents invalid configurations
- Database constraints ensure data integrity

## Support

For issues or questions:
1. Check audit logs for recent configuration changes
2. Verify parameter reference ranges in parameter_master
3. Review score_breakdown JSON for calculation details
4. Contact system administrator for configuration assistance