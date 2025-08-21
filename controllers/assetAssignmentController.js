const db = require('../database/db');

const assetAssignmentController = {
  // Get all asset assignments with additional details
  getAll: async (req, res) => {
    try {
      const query = `
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        ORDER BY aa.created_at DESC
      `;
      
      const [assignments] = await db.execute(query);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error fetching asset assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch asset assignments'
      });
    }
  },

  // Get asset assignments by asset ID
  getByAssetId: async (req, res) => {
    try {
      const { assetId } = req.params;
      
      const query = `
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        WHERE aa.asset_id = ?
        ORDER BY aa.created_at DESC
      `;
      
      const [assignments] = await db.execute(query, [assetId]);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error fetching asset assignments by asset ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch asset assignments'
      });
    }
  },

  // Get asset assignments by staff ID
  getByStaffId: async (req, res) => {
    try {
      const { staffId } = req.params;
      
      const query = `
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        WHERE aa.staff_id = ?
        ORDER BY aa.created_at DESC
      `;
      
      const [assignments] = await db.execute(query, [staffId]);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      console.error('Error fetching asset assignments by staff ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch asset assignments'
      });
    }
  },

  // Create new asset assignment
  create: async (req, res) => {
    try {
      const { asset_id, staff_id, assigned_date, comment } = req.body;
      const assigned_by = req.user?.id || 1; // Default to user ID 1 if not authenticated
      
      // Check if asset exists
      const [assets] = await db.execute('SELECT id FROM my_assets WHERE id = ?', [asset_id]);
      if (assets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Asset not found'
        });
      }
      
      // Check if staff exists
      const [staff] = await db.execute('SELECT id FROM staff WHERE id = ?', [staff_id]);
      if (staff.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Staff member not found'
        });
      }
      
      // Check if asset is already assigned (active assignment)
      const [existingAssignments] = await db.execute(
        'SELECT id FROM asset_assignments WHERE asset_id = ? AND status = "active"',
        [asset_id]
      );
      
      if (existingAssignments.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Asset is already assigned to another staff member'
        });
      }
      
      // Create new assignment
      const query = `
        INSERT INTO asset_assignments (asset_id, staff_id, assigned_date, assigned_by, comment, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `;
      
      const [result] = await db.execute(query, [asset_id, staff_id, assigned_date, assigned_by, comment]);
      
      // Fetch the created assignment with details
      const [newAssignment] = await db.execute(`
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        WHERE aa.id = ?
      `, [result.insertId]);
      
      res.status(201).json({
        success: true,
        data: newAssignment[0],
        message: 'Asset assigned successfully'
      });
    } catch (error) {
      console.error('Error creating asset assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create asset assignment'
      });
    }
  },

  // Update asset assignment
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, returned_date, comment } = req.body;
      
      // Check if assignment exists
      const [assignments] = await db.execute('SELECT id FROM asset_assignments WHERE id = ?', [id]);
      if (assignments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Asset assignment not found'
        });
      }
      
      // Update assignment
      const updateFields = [];
      const updateValues = [];
      
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (returned_date !== undefined) {
        updateFields.push('returned_date = ?');
        updateValues.push(returned_date);
      }
      
      if (comment !== undefined) {
        updateFields.push('comment = ?');
        updateValues.push(comment);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      updateValues.push(id);
      const query = `UPDATE asset_assignments SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await db.execute(query, updateValues);
      
      // Fetch updated assignment
      const [updatedAssignment] = await db.execute(`
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        WHERE aa.id = ?
      `, [id]);
      
      res.json({
        success: true,
        data: updatedAssignment[0],
        message: 'Asset assignment updated successfully'
      });
    } catch (error) {
      console.error('Error updating asset assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update asset assignment'
      });
    }
  },

  // Return asset (change status to returned)
  returnAsset: async (req, res) => {
    try {
      const { id } = req.params;
      const { returned_date, comment } = req.body;
      
      // Check if assignment exists and is active
      const [assignments] = await db.execute(
        'SELECT id FROM asset_assignments WHERE id = ? AND status = "active"',
        [id]
      );
      
      if (assignments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Active asset assignment not found'
        });
      }
      
      // Update assignment to returned
      const query = `
        UPDATE asset_assignments 
        SET status = 'returned', returned_date = ?, comment = ?
        WHERE id = ?
      `;
      
      await db.execute(query, [returned_date, comment, id]);
      
      // Fetch updated assignment
      const [updatedAssignment] = await db.execute(`
        SELECT 
          aa.*,
          a.asset_name,
          a.asset_code,
          s.name as staff_name,
          s.role as staff_role,
          u.username as assigned_by_name
        FROM asset_assignments aa
        LEFT JOIN my_assets a ON aa.asset_id = a.id
        LEFT JOIN staff s ON aa.staff_id = s.id
        LEFT JOIN users u ON aa.assigned_by = u.id
        WHERE aa.id = ?
      `, [id]);
      
      res.json({
        success: true,
        data: updatedAssignment[0],
        message: 'Asset returned successfully'
      });
    } catch (error) {
      console.error('Error returning asset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to return asset'
      });
    }
  },

  // Delete asset assignment
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if assignment exists
      const [assignments] = await db.execute('SELECT id FROM asset_assignments WHERE id = ?', [id]);
      if (assignments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Asset assignment not found'
        });
      }
      
      // Delete assignment
      await db.execute('DELETE FROM asset_assignments WHERE id = ?', [id]);
      
      res.json({
        success: true,
        message: 'Asset assignment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting asset assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete asset assignment'
      });
    }
  }
};

module.exports = assetAssignmentController;
