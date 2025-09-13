const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise use individual parameters
const connectionString = process.env.DATABASE_URL;

// Fallback to individual parameters if connection string not available
let dbConfig;

if (connectionString) {
  dbConfig = {
    connectionString,
    // ssl: { rejectUnauthorized:now false }
  };
  console.log('🔗 Using connection string for database');
} else if (process.env.DB_HOST && process.env.DB_PASSWORD) {
  // Use individual parameters
  dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // ssl: { rejectUnauthorized: false }
  };
  console.log('🔗 Using individual parameters for database connection');
} else {
  console.error('❌ No database configuration found!');
  console.error('Please set either DATABASE_URL or individual DB parameters in .env');
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed:', { 
        text: text.substring(0, 50), 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    console.error('Query:', text);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

// Initialize database tables (check if they exist)
const initializeDatabase = async () => {
  try {
    console.log('🔄 Checking database tables...');
    
    // Check if critical tables exist
    const tables = ['users', 'user_reports', 'companies', 'parameter_master'];
    const missingTables = [];
    
    for (const table of tables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (!result.rows[0].exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
      console.log('📋 Please run: node setup-database.js');
      return false;
    } else {
      console.log('✅ All required database tables found');
      
      // Check for demo company
      const companyCheck = await query(
        "SELECT company_id FROM companies WHERE company_id = 'CUG1'"
      );
      
      if (companyCheck.rows.length === 0) {
        console.log('🏢 Creating default company...');
        await query(`
          INSERT INTO companies (company_id, company_name, contact_email)
          VALUES ('CUG1', 'Default Company', 'contact@default.com')
        `);
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    return false;
  }
};

// Test the connection
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version, current_database() as database');
    console.log('🕐 Database time:', new Date(result.rows[0].current_time).toLocaleString());
    console.log('📊 Database:', result.rows[0].version.split(' ')[0]);
    console.log('📁 Connected to database:', result.rows[0].database);
    
    // Check if gender columns exist
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parameter_master' 
      AND column_name LIKE 'reference_%_male' OR column_name LIKE 'reference_%_female'
      ORDER BY column_name
    `);
    console.log('🔍 Gender-specific columns found:', columnCheck.rows.map(r => r.column_name).join(', ') || 'None');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
});

module.exports = {
  pool,
  query,
  getClient,
  initializeDatabase,
  testConnection
};

if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log('Pool total:', pool.totalCount);      // total clients
    console.log('Pool idle:', pool.idleCount);        // idle clients
    console.log('Pool waiting:', pool.waitingCount);  // waiting requests
  }, 60000);
}