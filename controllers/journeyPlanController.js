const db = require('../database');

const journeyPlanController = {
  // Get all journey plans
  getJourneyPlans: async (req, res) => {
    try {
      console.log('Fetching journey plans...');
      
      // First check if the table exists
      const [tables] = await db.query('SHOW TABLES LIKE "journeyPlan"');
      console.log('Table check result:', tables);

      if (tables.length === 0) {
        console.log('journeyPlan table does not exist');
        return res.status(500).json({ message: 'journeyPlan table not found' });
      }

      // Check the table structure
      const [columns] = await db.query('DESCRIBE journeyPlan');
      console.log('Table structure:', columns);

      // Get the data
      const [journeyPlans] = await db.query(`
        SELECT 
          jp.*,
          s.name as staffName,
          s.phone as staffPhone,
          p.name as premisesName
        FROM journeyPlan jp
        LEFT JOIN staff s ON jp.userId = s.id
        LEFT JOIN premises p ON jp.premisesId = p.id
        ORDER BY jp.date DESC
      `);
      
      console.log('Fetched journey plans:', journeyPlans);
      res.json(journeyPlans);
    } catch (error) {
      console.error('Error fetching journey plans:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        message: 'Failed to fetch journey plans',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get a single journey plan
  getJourneyPlan: async (req, res) => {
    try {
      const [journeyPlans] = await db.query(
        `SELECT 
          jp.*,
          s.name as staffName,
          s.phone as staffPhone,
          p.name as premisesName,
          st.name as serviceTypeName
        FROM journeyPlan jp
        LEFT JOIN staff s ON jp.userId = s.id
        LEFT JOIN premises p ON jp.premisesId = p.id
        LEFT JOIN service_types st ON jp.service_type_id = st.id
        WHERE jp.id = ?`,
        [req.params.id]
      );

      if (journeyPlans.length === 0) {
        return res.status(404).json({ message: 'Journey plan not found' });
      }

      res.json(journeyPlans[0]);
    } catch (error) {
      console.error('Error fetching journey plan:', error);
      res.status(500).json({ message: 'Failed to fetch journey plan' });
    }
  },

  // Create a new journey plan
  createJourneyPlan: async (req, res) => {
    const { 
      userId,
      premisesId,
      serviceTypeId,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      priority,
      status = 'pending'
    } = req.body;

    if (!userId || !premisesId || !serviceTypeId || !pickupLocation || !dropoffLocation || !pickupDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      // Check if staff exists
      const [staff] = await db.query('SELECT id FROM staff WHERE id = ?', [userId]);
      if (staff.length === 0) {
        return res.status(404).json({ message: 'Staff not found' });
      }

      // Check if premises exists
      const [premises] = await db.query('SELECT id FROM premises WHERE id = ?', [premisesId]);
      if (premises.length === 0) {
        return res.status(404).json({ message: 'Premises not found' });
      }

      // Check if service type exists
      const [serviceTypes] = await db.query('SELECT id FROM service_types WHERE id = ?', [serviceTypeId]);
      if (serviceTypes.length === 0) {
        return res.status(404).json({ message: 'Service type not found' });
      }

      // Create the journey plan
      const [result] = await db.query(
        `INSERT INTO journeyPlan (
          userId,
          premisesId,
          service_type_id,
          pickup_location,
          dropoff_location,
          pickup_date,
          priority,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, premisesId, serviceTypeId, pickupLocation, dropoffLocation, pickupDate, priority, status]
      );

      // Fetch the created journey plan with related data
      const [newJourneyPlan] = await db.query(
        `SELECT 
          jp.*,
          s.name as staffName,
          s.phone as staffPhone,
          p.name as premisesName,
          st.name as serviceTypeName
        FROM journeyPlan jp
        LEFT JOIN staff s ON jp.userId = s.id
        LEFT JOIN premises p ON jp.premisesId = p.id
        LEFT JOIN service_types st ON jp.service_type_id = st.id
        WHERE jp.id = ?`,
        [result.insertId]
      );

      res.status(201).json(newJourneyPlan[0]);
    } catch (error) {
      console.error('Error creating journey plan:', error);
      res.status(500).json({ message: 'Failed to create journey plan' });
    }
  },

  // Update a journey plan
  updateJourneyPlan: async (req, res) => {
    const { 
      status,
      priority,
      pickupLocation,
      dropoffLocation,
      pickupDate
    } = req.body;
    const journeyPlanId = req.params.id;

    try {
      // Check if journey plan exists
      const [journeyPlans] = await db.query('SELECT id FROM journeyPlan WHERE id = ?', [journeyPlanId]);
      if (journeyPlans.length === 0) {
        return res.status(404).json({ message: 'Journey plan not found' });
      }

      // Update the journey plan
      const updates = [];
      const values = [];

      if (status) {
        updates.push('status = ?');
        values.push(status);
      }
      if (priority) {
        updates.push('priority = ?');
        values.push(priority);
      }
      if (pickupLocation) {
        updates.push('pickup_location = ?');
        values.push(pickupLocation);
      }
      if (dropoffLocation) {
        updates.push('dropoff_location = ?');
        values.push(dropoffLocation);
      }
      if (pickupDate) {
        updates.push('pickup_date = ?');
        values.push(pickupDate);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No valid updates provided' });
      }

      values.push(journeyPlanId);
      await db.query(
        `UPDATE journeyPlan SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Fetch the updated journey plan with related data
      const [updatedJourneyPlan] = await db.query(
        `SELECT 
          jp.*,
          s.name as staffName,
          s.phone as staffPhone,
          p.name as premisesName,
        FROM journeyPlan jp
        LEFT JOIN staff s ON jp.userId = s.id
        LEFT JOIN premises p ON jp.premisesId = p.id
       
        WHERE jp.id = ?`,
        [journeyPlanId]
      );

      res.json(updatedJourneyPlan[0]);
    } catch (error) {
      console.error('Error updating journey plan:', error);
      res.status(500).json({ message: 'Failed to update journey plan' });
    }
  },

  // Delete a journey plan
  deleteJourneyPlan: async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM journeyPlan WHERE id = ?', [req.params.id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Journey plan not found' });
      }

      res.json({ message: 'Journey plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting journey plan:', error);
      res.status(500).json({ message: 'Failed to delete journey plan' });
    }
  }
};

module.exports = journeyPlanController; 