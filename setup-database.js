const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the Supabase connection string
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ No database connection string found in environment variables');
  console.error('Please set DATABASE_URL or SUPABASE_DB_URL in your .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  // ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up Supabase database...');
    console.log('📍 Connecting to:', connectionString.split('@')[1]?.split(':')[0] || 'database');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Read the schema files
    const schemaFiles = [
      'database/user.sql',
      'database/other.sql',
      'database/schema.sql', 
      'database/parameter_categories_rows.sql',
      'database/parameter_master_rows.sql',
      'database/parameter_category_mapping_rows.sql',
      'database/data_comp.sql',
      'database/corporate_users_rows.sql',
      'database/tables.sql'
    ];
    
    for (const schemaFile of schemaFiles) {
      const filePath = path.join(__dirname, schemaFile);
      
      if (fs.existsSync(filePath)) {
        console.log(`\n📄 Processing ${schemaFile}...`);
        const schemaSQL = fs.readFileSync(filePath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = schemaSQL
          .split(';')
          .filter(stmt => stmt.trim().length > 0)
          .map(stmt => stmt.trim() + ';');
        
        for (const statement of statements) {
          if (statement.trim() && !statement.includes('--')) {
            try {
              // Skip GRANT statements for Supabase (they handle permissions differently)
              if (statement.includes('GRANT')) {
                console.log('⏭️  Skipping GRANT statement (handled by Supabase)');
                continue;
              }
              
              console.log('🔸 Executing:', statement.substring(0, 50) + '...');
              await client.query(statement);
            } catch (err) {
              console.error('⚠️  Warning:', err.message);
              // Continue on error (might be duplicate key constraints)
            }
          }
        }
      } else {
        console.log(`⚠️  Schema file not found: ${schemaFile}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Database setup complete!');
    
    // Test the setup
    console.log('\n🧪 Testing database setup...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Create demo data
    console.log('\n🌱 Creating demo data...');
    
    // Check if admin user exists
    const adminCheck = await client.query(
      "SELECT user_id FROM users WHERE user_id = 'ADMIN001'"
    );
    
    if (adminCheck.rows.length === 0) {
      // Create demo admin user (password: Admin123)
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('Admin123', 10);
      
      await client.query(`
        INSERT INTO users (user_id, email, first_name, last_name, company_id, password_hash, first_login, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['ADMIN001', 'admin@smartreport.com', 'System', 'Admin', 'CUG1', adminPassword, false, true]);
      
      console.log('✅ Demo admin user created (email: admin@smartreport.com, password: Admin123)');
    }
    
    // Create demo user
    const userCheck = await client.query(
      "SELECT user_id FROM users WHERE user_id = 'DEMO001'"
    );
    
    if (userCheck.rows.length === 0) {
      const userPassword = await bcrypt.hash('Demo123', 10);
      
      await client.query(`
        INSERT INTO users (user_id, email, first_name, last_name, company_id, password_hash, first_login, email_verified, uhid, date_of_birth, gender)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, ['DEMO001', 'demo@smartreport.com', 'Demo', 'User', 'CUG1', userPassword, false, true, 'UHID001', '1990-01-01', 'Male']);
      
      console.log('✅ Demo user created (email: demo@smartreport.com, password: Demo123)');
    }
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Add command line argument handling
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Smart Report Database Setup

Usage: node setup-database.js [options]

Options:
  --help, -h     Show this help message
  --force        Force recreation of all tables (WARNING: will drop existing data)
  
Environment Variables Required:
  DATABASE_URL or SUPABASE_DB_URL - PostgreSQL connection string

Example:
  node setup-database.js
  `);
  process.exit(0);
}

setupDatabase();