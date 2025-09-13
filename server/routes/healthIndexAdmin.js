const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

/**
 * Health Index Configuration Admin Routes
 * All routes require admin authentication
 */

// Get all Health Index parameters with their configuration
router.get('/parameters', async (req, res) => {
  console.log('[HealthIndexAdmin] GET /parameters - Request received');
  console.log('[HealthIndexAdmin] User:', req.admin);
  
  try {
    console.log('[HealthIndexAdmin] Executing query for parameters...');
    const result = await query(`
      SELECT 
        hip.*,
        pm.parameter_id as pm_parameter_id,
        pm.parameter_key,
        pm.unit,
        pm.reference_min,
        pm.reference_max,
        pm.reference_min_male,
        pm.reference_max_male,
        pm.reference_min_female,
        pm.reference_max_female
      FROM parameter_master pm
      LEFT JOIN health_index_parameters hip ON pm.parameter_id = hip.parameter_id
      ORDER BY pm.parameter_key
    `);

    console.log(`[HealthIndexAdmin] Query returned ${result.rows.length} rows`);
    console.log('[HealthIndexAdmin] First row sample:', result.rows[0]);

    // For parameters not in health_index_parameters, provide defaults
    const parameters = result.rows.map(row => ({
      parameter_id: row.pm_parameter_id || row.parameter_id,
      parameter_key: row.parameter_key,
      unit: row.unit,
      include_in_index: row.include_in_index !== null ? row.include_in_index : false,
      direction: row.direction || 'high_bad',
      pmax: row.pmax !== null ? parseFloat(row.pmax) : 75,
      k_full: row.k_full !== null ? parseFloat(row.k_full) : 0.25,
      weight: row.weight !== null ? parseFloat(row.weight) : 1.0,
      is_active: row.is_active !== null ? row.is_active : true,
      reference_min: row.reference_min,
      reference_max: row.reference_max,
      reference_min_male: row.reference_min_male,
      reference_max_male: row.reference_max_male,
      reference_min_female: row.reference_min_female,
      reference_max_female: row.reference_max_female
    }));

    console.log(`[HealthIndexAdmin] Sending ${parameters.length} parameters`);
    res.json(parameters);
  } catch (error) {
    console.error('[HealthIndexAdmin] Error fetching Health Index parameters:', error);
    console.error('[HealthIndexAdmin] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch parameters', details: error.message });
  }
});

// Update Health Index parameter configuration
router.put('/parameters/:parameterId', async (req, res) => {
  const { parameterId } = req.params;
  const { include_in_index, direction, pmax, k_full, weight, is_active } = req.body;
  const adminUser = req.admin?.email || 'system';

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Check if parameter exists in health_index_parameters
    const existsResult = await client.query(
      'SELECT id FROM health_index_parameters WHERE parameter_id = $1',
      [parameterId]
    );

    if (existsResult.rows.length > 0) {
      // Update existing
      await client.query(`
        UPDATE health_index_parameters 
        SET 
          include_in_index = $1,
          direction = $2,
          pmax = $3,
          k_full = $4,
          weight = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE parameter_id = $7
      `, [include_in_index, direction, pmax, k_full, weight, is_active, parameterId]);
    } else {
      // Insert new
      await client.query(`
        INSERT INTO health_index_parameters 
        (parameter_id, include_in_index, direction, pmax, k_full, weight, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [parameterId, include_in_index, direction, pmax, k_full, weight, is_active]);
    }

    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Parameter updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating Health Index parameter:', error);
    res.status(500).json({ error: 'Failed to update parameter' });
  } finally {
    client.release();
  }
});

// Get all combination rules
router.get('/combinations', async (req, res) => {
  console.log('[HealthIndexAdmin] GET /combinations - Request received');
  console.log('[HealthIndexAdmin] User:', req.admin);
  
  try {
    console.log('[HealthIndexAdmin] Executing query for combinations...');
    const result = await query(`
      SELECT * FROM health_index_combinations
      ORDER BY rule_name
    `);

    console.log(`[HealthIndexAdmin] Query returned ${result.rows.length} rows`);
    console.log('[HealthIndexAdmin] Combinations:', result.rows);
    
    res.json(result.rows);
  } catch (error) {
    console.error('[HealthIndexAdmin] Error fetching combinations:', error);
    console.error('[HealthIndexAdmin] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch combinations', details: error.message });
  }
});

// Create new combination rule
router.post('/combinations', async (req, res) => {
  const { rule_name, members, trigger_type, trigger_threshold, combo_max, scale_by_avg, is_active } = req.body;
  const adminUser = req.admin?.email || 'system';

  try {
    // Validate members
    if (!members?.parameter_ids || members.parameter_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 member parameters required' });
    }

    // Validate trigger threshold
    if (trigger_type === 'avg_dev_ge_t' && (!trigger_threshold || trigger_threshold <= 0 || trigger_threshold > 1)) {
      return res.status(400).json({ error: 'Valid threshold required for average deviation trigger' });
    }

    const result = await query(`
      INSERT INTO health_index_combinations 
      (rule_name, members, trigger_type, trigger_threshold, combo_max, scale_by_avg, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      rule_name,
      JSON.stringify(members),
      trigger_type,
      trigger_type === 'avg_dev_ge_t' ? trigger_threshold : null,
      combo_max,
      scale_by_avg,
      is_active
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating combination:', error);
    res.status(500).json({ error: 'Failed to create combination' });
  }
});

// Update combination rule
router.put('/combinations/:id', async (req, res) => {
  const { id } = req.params;
  const { rule_name, members, trigger_type, trigger_threshold, combo_max, scale_by_avg, is_active } = req.body;
  const adminUser = req.admin?.email || 'system';

  try {
    // Validate members
    if (!members?.parameter_ids || members.parameter_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 member parameters required' });
    }

    // Validate trigger threshold
    if (trigger_type === 'avg_dev_ge_t' && (!trigger_threshold || trigger_threshold <= 0 || trigger_threshold > 1)) {
      return res.status(400).json({ error: 'Valid threshold required for average deviation trigger' });
    }

    const result = await query(`
      UPDATE health_index_combinations 
      SET 
        rule_name = $1,
        members = $2,
        trigger_type = $3,
        trigger_threshold = $4,
        combo_max = $5,
        scale_by_avg = $6,
        is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      rule_name,
      JSON.stringify(members),
      trigger_type,
      trigger_type === 'avg_dev_ge_t' ? trigger_threshold : null,
      combo_max,
      scale_by_avg,
      is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Combination not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating combination:', error);
    res.status(500).json({ error: 'Failed to update combination' });
  }
});

// Delete combination rule
router.delete('/combinations/:id', async (req, res) => {
  const { id } = req.params;
  const adminUser = req.admin?.email || 'system';

  try {
    const result = await query(
      'DELETE FROM health_index_combinations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Combination not found' });
    }

    res.json({ success: true, message: 'Combination deleted successfully' });
  } catch (error) {
    console.error('Error deleting combination:', error);
    res.status(500).json({ error: 'Failed to delete combination' });
  }
});

// Get audit trail
router.get('/audit', async (req, res) => {
  const { table_name, record_id, limit = 50 } = req.query;

  try {
    let queryText = `
      SELECT * FROM health_index_config_audit
      WHERE 1=1
    `;
    const params = [];

    if (table_name) {
      params.push(table_name);
      queryText += ` AND table_name = $${params.length}`;
    }

    if (record_id) {
      params.push(record_id);
      queryText += ` AND record_id = $${params.length}`;
    }

    params.push(limit);
    queryText += ` ORDER BY changed_at DESC LIMIT $${params.length}`;

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

module.exports = router;