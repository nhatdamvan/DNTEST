-- =====================================================
-- IntelliSystem Database Setup Script
-- Version: 1.0
-- Date: August 2025
-- Description: Complete database setup with all tables, 
--              relations, indexes, views, and seed data
-- =====================================================

-- Create database (run as superuser)
-- CREATE DATABASE intelli_system;
-- \c intelli_system;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CLEANUP (for fresh installation)
-- =====================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- ENUM TYPES
-- =====================================================
CREATE TYPE admin_role AS ENUM ('admin', 'superadmin');
CREATE TYPE batch_status AS ENUM ('uploaded', 'validating', 'validated', 'processing', 'completed', 'failed', 'rejected');
CREATE TYPE report_status AS ENUM ('active', 'inactive', 'deleted');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE risk_category AS ENUM ('Low', 'Medium', 'High', 'Very High');
CREATE TYPE parameter_direction AS ENUM ('high_bad', 'low_bad', 'two_sided');

-- =====================================================
-- TABLES CREATION (Order matters for foreign keys)
-- =====================================================

-- 1. Companies table (no dependencies)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    employee_count INTEGER DEFAULT 0,
    employee_count_by_year JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table (depends on companies)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender gender_type,
    company_id VARCHAR(50) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    password_hash VARCHAR(255),
    first_login BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    uhid VARCHAR(50) UNIQUE,
    location VARCHAR(100) DEFAULT 'Hanoi',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Reports table (depends on users)
CREATE TABLE user_reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    biological_age INTEGER CHECK (biological_age >= 0),
    test_date DATE NOT NULL,
    report_status report_status DEFAULT 'active',
    score_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parameter Master table (no dependencies)
CREATE TABLE parameter_master (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20) UNIQUE NOT NULL,
    parameter_key VARCHAR(100) NOT NULL,
    parameter_key_vi VARCHAR(100),
    unit VARCHAR(50),
    reference_min_male NUMERIC(10,2),
    reference_max_male NUMERIC(10,2),
    reference_min_female NUMERIC(10,2),
    reference_max_female NUMERIC(10,2),
    parameter_priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_parameter_key UNIQUE(parameter_key),
    CONSTRAINT unique_priority UNIQUE(parameter_priority)
);

-- 5. Lab Parameters table (depends on user_reports)
CREATE TABLE lab_parameters (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(100) REFERENCES user_reports(report_id) ON DELETE CASCADE,
    parameter_name VARCHAR(100),
    parameter_value VARCHAR(50),
    unit VARCHAR(50),
    reference_min NUMERIC(10,2),
    reference_max NUMERIC(10,2),
    status VARCHAR(20),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Parameter Categories table (no dependencies)
CREATE TABLE parameter_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_name_vi VARCHAR(100),
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Parameter Category Mappings (depends on parameter_master and parameter_categories)
CREATE TABLE parameter_category_mappings (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20) REFERENCES parameter_master(parameter_id) ON DELETE CASCADE,
    category_id VARCHAR(20) REFERENCES parameter_categories(category_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parameter_id, category_id)
);

-- 8. Health Index Parameters (depends on parameter_master)
CREATE TABLE health_index_parameters (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20) UNIQUE REFERENCES parameter_master(parameter_id) ON DELETE CASCADE,
    direction parameter_direction NOT NULL,
    pmax NUMERIC(6,2) DEFAULT 75,
    k_full NUMERIC(4,3) DEFAULT 0.25,
    weight NUMERIC(4,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Health Index Combinations (no dependencies)
CREATE TABLE health_index_combinations (
    id SERIAL PRIMARY KEY,
    combination_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    parameters TEXT[],
    threshold NUMERIC(10,2),
    penalty NUMERIC(6,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Admin Users table (no dependencies)
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role admin_role DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Health Index Config Audit (depends on admin_users)
CREATE TABLE health_index_config_audit (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20),
    changed_by INTEGER REFERENCES admin_users(id),
    change_type VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Batch Uploads table (no dependencies)
CREATE TABLE batch_uploads (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    status batch_status DEFAULT 'uploaded',
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    file_path VARCHAR(500),
    company_id VARCHAR(50) REFERENCES companies(company_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 13. Batch Records (depends on batch_uploads)
CREATE TABLE batch_records (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) REFERENCES batch_uploads(batch_id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    user_data JSONB NOT NULL,
    validation_status VARCHAR(20),
    error_message TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Corporate Users (depends on companies)
CREATE TABLE corporate_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'hr',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Risk Assessments (depends on users)
CREATE TABLE risk_assessments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) NOT NULL,
    assessment_date DATE NOT NULL,
    risk_score NUMERIC(10,2),
    risk_category risk_category,
    assessment_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Corporate Health Metrics (depends on companies)
CREATE TABLE corporate_health_metrics (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    metric_year INTEGER NOT NULL,
    total_employees INTEGER DEFAULT 0,
    health_checks_completed INTEGER DEFAULT 0,
    average_health_score NUMERIC(5,2),
    risk_distribution JSONB DEFAULT '{}',
    demographic_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, metric_date)
);

-- 17. Demographic Averages (no dependencies)
CREATE TABLE demographic_averages (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    average_value NUMERIC(10,2),
    sample_size INTEGER DEFAULT 0,
    calculation_date DATE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Email Verifications (no dependencies)
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. User Deletion Audit (depends on admin_users)
CREATE TABLE user_deletion_audit (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    company_id VARCHAR(50),
    deleted_count INTEGER DEFAULT 0,
    deleted_by_admin_id INTEGER REFERENCES admin_users(id),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    additional_info JSONB DEFAULT '{}'
);

-- 20. Vietnamese Config (no dependencies)
CREATE TABLE vietnamese_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User Reports indexes
CREATE INDEX idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX idx_user_reports_test_date ON user_reports(test_date);
CREATE INDEX idx_user_reports_report_id ON user_reports(report_id);
CREATE INDEX idx_user_reports_health_score ON user_reports(health_score);

-- Lab Parameters indexes
CREATE INDEX idx_lab_parameters_report_id ON lab_parameters(report_id);
CREATE INDEX idx_lab_parameters_parameter_name ON lab_parameters(parameter_name);
CREATE INDEX idx_lab_parameters_status ON lab_parameters(status);

-- Batch indexes
CREATE INDEX idx_batch_uploads_batch_id ON batch_uploads(batch_id);
CREATE INDEX idx_batch_uploads_status ON batch_uploads(status);
CREATE INDEX idx_batch_uploads_company_id ON batch_uploads(company_id);
CREATE INDEX idx_batch_records_batch_id ON batch_records(batch_id);

-- Risk Assessments indexes
CREATE INDEX idx_risk_assessments_user_id ON risk_assessments(user_id);
CREATE INDEX idx_risk_assessments_type ON risk_assessments(assessment_type);
CREATE INDEX idx_risk_assessments_date ON risk_assessments(assessment_date);

-- Corporate Health Metrics indexes
CREATE INDEX idx_corporate_health_metrics_company_id ON corporate_health_metrics(company_id);
CREATE INDEX idx_corporate_health_metrics_date ON corporate_health_metrics(metric_date);

-- Email Verifications indexes
CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);

-- =====================================================
-- VIEWS
-- =====================================================

-- Parameter usage status view
CREATE OR REPLACE VIEW parameter_usage_status AS
SELECT 
    pm.parameter_id,
    pm.parameter_key,
    COUNT(DISTINCT lp.report_id) as usage_count,
    CASE 
        WHEN COUNT(DISTINCT lp.report_id) = 0 THEN 'can_delete'
        ELSE 'in_use'
    END as deletion_eligibility
FROM parameter_master pm
LEFT JOIN lab_parameters lp ON pm.parameter_key = lp.parameter_name
GROUP BY pm.parameter_id, pm.parameter_key;

-- Parameter master with gender ranges view
CREATE OR REPLACE VIEW parameter_master_with_gender_ranges AS
SELECT 
    pm.*,
    hip.direction,
    hip.pmax,
    hip.k_full,
    hip.weight,
    hip.is_active as index_active
FROM parameter_master pm
LEFT JOIN health_index_parameters hip ON pm.parameter_id = hip.parameter_id;

-- Company health summary view
CREATE OR REPLACE VIEW company_health_summary AS
SELECT 
    c.company_id,
    c.company_name,
    COUNT(DISTINCT u.user_id) as total_users,
    COUNT(DISTINCT ur.user_id) as users_with_reports,
    AVG(ur.health_score) as avg_health_score,
    MAX(ur.test_date) as last_test_date
FROM companies c
LEFT JOIN users u ON c.company_id = u.company_id
LEFT JOIN user_reports ur ON u.user_id = ur.user_id
GROUP BY c.company_id, c.company_name;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reports_updated_at BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parameter_master_updated_at BEFORE UPDATE ON parameter_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate UHID
CREATE OR REPLACE FUNCTION generate_uhid()
RETURNS TEXT AS $$
DECLARE
    new_uhid TEXT;
    date_part TEXT;
    sequence_num INTEGER;
BEGIN
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(uhid FROM 11 FOR 5) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM users
    WHERE uhid LIKE 'UH' || date_part || '%';
    
    new_uhid := 'UH' || date_part || LPAD(sequence_num::TEXT, 5, '0');
    RETURN new_uhid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert companies
INSERT INTO companies (company_id, company_name, contact_email, employee_count, employee_count_by_year) VALUES
('DEMO001', 'Demo Corporation', 'hr@democorp.com', 100, '{"2024": 85, "2025": 100}'),
('TEST001', 'Test Industries', 'admin@testind.com', 50, '{"2024": 45, "2025": 50}'),
('INSMART', 'Insmart Vietnam', 'hr@insmart.vn', 500, '{"2024": 450, "2025": 500}');

-- Insert admin users (password is 'admin123' hashed with bcrypt)
INSERT INTO admin_users (name, email, password, role) VALUES
('System Admin', 'admin@system.com', '$2b$10$YourHashedPasswordHere', 'superadmin'),
('Demo Admin', 'demo@admin.com', '$2b$10$YourHashedPasswordHere', 'admin');

-- Insert corporate users (password is 'corp123' hashed with bcrypt)
INSERT INTO corporate_users (username, password, full_name, email, company_id, role) VALUES
('democorp_hr', '$2b$10$YourHashedPasswordHere', 'Demo HR Manager', 'hr@democorp.com', 'DEMO001', 'hr'),
('insmart_hr', '$2b$10$YourHashedPasswordHere', 'Insmart HR Admin', 'hr@insmart.vn', 'INSMART', 'hr');

-- Insert parameter categories
INSERT INTO parameter_categories (category_id, category_name, category_name_vi, display_order) VALUES
('CAT001', 'Hematology', 'Huyết học', 1),
('CAT002', 'Biochemistry', 'Sinh hóa', 2),
('CAT003', 'Lipid Profile', 'Mỡ máu', 3),
('CAT004', 'Liver Function', 'Chức năng gan', 4),
('CAT005', 'Kidney Function', 'Chức năng thận', 5),
('CAT006', 'Cardiac Markers', 'Chỉ số tim', 6),
('CAT007', 'Diabetes', 'Tiểu đường', 7),
('CAT008', 'Vitamins', 'Vitamin', 8),
('CAT009', 'Hormones', 'Nội tiết', 9),
('CAT010', 'Immunology', 'Miễn dịch', 10);

-- Insert parameter master data (common health parameters)
INSERT INTO parameter_master (parameter_id, parameter_key, parameter_key_vi, unit, 
    reference_min_male, reference_max_male, reference_min_female, reference_max_female, parameter_priority) VALUES
('P001', 'Hemoglobin', 'Hemoglobin', 'g/dL', 13.5, 17.5, 12.0, 15.5, 1),
('P002', 'RBC Count', 'Số lượng hồng cầu', 'million/μL', 4.5, 5.9, 4.1, 5.1, 2),
('P003', 'WBC Count', 'Số lượng bạch cầu', '10³/μL', 4.5, 11.0, 4.5, 11.0, 3),
('P004', 'Platelet Count', 'Số lượng tiểu cầu', '10³/μL', 150, 400, 150, 400, 4),
('P005', 'Fasting Glucose', 'Đường huyết lúc đói', 'mg/dL', 70, 100, 70, 100, 5),
('P006', 'HbA1c', 'HbA1c', '%', 4.0, 5.6, 4.0, 5.6, 6),
('P007', 'Total Cholesterol', 'Cholesterol toàn phần', 'mg/dL', 0, 200, 0, 200, 7),
('P008', 'LDL Cholesterol', 'LDL Cholesterol', 'mg/dL', 0, 100, 0, 100, 8),
('P009', 'HDL Cholesterol', 'HDL Cholesterol', 'mg/dL', 40, 200, 50, 200, 9),
('P010', 'Triglycerides', 'Triglycerid', 'mg/dL', 0, 150, 0, 150, 10),
('P011', 'ALT (SGPT)', 'ALT (SGPT)', 'U/L', 10, 40, 10, 35, 11),
('P012', 'AST (SGOT)', 'AST (SGOT)', 'U/L', 10, 40, 10, 35, 12),
('P013', 'Creatinine', 'Creatinine', 'mg/dL', 0.7, 1.3, 0.6, 1.1, 13),
('P014', 'Urea', 'Urê', 'mg/dL', 17, 43, 17, 43, 14),
('P015', 'Uric Acid', 'Acid Uric', 'mg/dL', 3.5, 7.2, 2.6, 6.0, 15),
('P016', 'Vitamin D', 'Vitamin D', 'ng/mL', 30, 100, 30, 100, 16),
('P017', 'Vitamin B12', 'Vitamin B12', 'pg/mL', 200, 900, 200, 900, 17),
('P018', 'TSH', 'TSH', 'mIU/L', 0.4, 4.0, 0.4, 4.0, 18),
('P019', 'Blood Pressure Systolic', 'Huyết áp tâm thu', 'mmHg', 90, 120, 90, 120, 19),
('P020', 'Blood Pressure Diastolic', 'Huyết áp tâm trương', 'mmHg', 60, 80, 60, 80, 20);

-- Map parameters to categories
INSERT INTO parameter_category_mappings (parameter_id, category_id) VALUES
('P001', 'CAT001'), ('P002', 'CAT001'), ('P003', 'CAT001'), ('P004', 'CAT001'),
('P005', 'CAT007'), ('P006', 'CAT007'),
('P007', 'CAT003'), ('P008', 'CAT003'), ('P009', 'CAT003'), ('P010', 'CAT003'),
('P011', 'CAT004'), ('P012', 'CAT004'),
('P013', 'CAT005'), ('P014', 'CAT005'), ('P015', 'CAT005'),
('P016', 'CAT008'), ('P017', 'CAT008'),
('P018', 'CAT009'),
('P019', 'CAT006'), ('P020', 'CAT006');

-- Insert health index parameters configuration
INSERT INTO health_index_parameters (parameter_id, direction, pmax, k_full, weight) VALUES
('P001', 'low_bad', 75, 0.25, 1.0),    -- Hemoglobin - low is bad
('P005', 'high_bad', 75, 0.25, 1.5),   -- Glucose - high is bad (higher weight)
('P006', 'high_bad', 80, 0.30, 2.0),   -- HbA1c - high is bad (highest weight)
('P007', 'high_bad', 70, 0.25, 1.2),   -- Total Cholesterol - high is bad
('P008', 'high_bad', 75, 0.25, 1.3),   -- LDL - high is bad
('P009', 'low_bad', 70, 0.25, 1.1),    -- HDL - low is bad
('P010', 'high_bad', 75, 0.25, 1.2),   -- Triglycerides - high is bad
('P011', 'high_bad', 60, 0.20, 0.8),   -- ALT - high is bad
('P012', 'high_bad', 60, 0.20, 0.8),   -- AST - high is bad
('P013', 'high_bad', 70, 0.25, 1.0),   -- Creatinine - high is bad
('P015', 'high_bad', 65, 0.25, 0.9),   -- Uric Acid - high is bad
('P016', 'low_bad', 60, 0.20, 0.7),    -- Vitamin D - low is bad
('P019', 'two_sided', 80, 0.30, 1.5),  -- Systolic BP - both high and low are bad
('P020', 'two_sided', 80, 0.30, 1.5);  -- Diastolic BP - both high and low are bad

-- Insert health index combination rules
INSERT INTO health_index_combinations (combination_name, rule_type, parameters, threshold, penalty) VALUES
('Metabolic Syndrome', 'all_out', ARRAY['P005', 'P007', 'P010'], NULL, 15.0),
('Cardiovascular Risk', 'any_two', ARRAY['P007', 'P008', 'P019', 'P020'], NULL, 10.0),
('Liver Function Alert', 'all_out', ARRAY['P011', 'P012'], NULL, 8.0),
('Kidney Function Alert', 'all_out', ARRAY['P013', 'P014'], NULL, 8.0),
('Diabetes Risk', 'all_out', ARRAY['P005', 'P006'], NULL, 12.0);

-- Insert demo users
INSERT INTO users (user_id, email, first_name, last_name, date_of_birth, gender, company_id, uhid) VALUES
('USR001', 'john.doe@democorp.com', 'John', 'Doe', '1985-05-15', 'Male', 'DEMO001', generate_uhid()),
('USR002', 'jane.smith@democorp.com', 'Jane', 'Smith', '1990-08-22', 'Female', 'DEMO001', generate_uhid()),
('USR003', 'robert.johnson@testind.com', 'Robert', 'Johnson', '1988-03-10', 'Male', 'TEST001', generate_uhid()),
('USR004', 'emily.williams@insmart.vn', 'Emily', 'Williams', '1992-11-28', 'Female', 'INSMART', generate_uhid()),
('USR005', 'michael.brown@insmart.vn', 'Michael', 'Brown', '1987-07-04', 'Male', 'INSMART', generate_uhid());

-- Insert demo reports
INSERT INTO user_reports (report_id, user_id, health_score, biological_age, test_date, score_breakdown) VALUES
('SR-2025-USR001-' || uuid_generate_v4(), 'USR001', 85, 36, '2025-08-01', 
    '{"cardiovascular": 88, "metabolic": 82, "liver": 90, "kidney": 92}'),
('SR-2025-USR002-' || uuid_generate_v4(), 'USR002', 78, 32, '2025-08-05',
    '{"cardiovascular": 75, "metabolic": 78, "liver": 85, "kidney": 88}'),
('SR-2025-USR003-' || uuid_generate_v4(), 'USR003', 72, 40, '2025-08-10',
    '{"cardiovascular": 70, "metabolic": 68, "liver": 75, "kidney": 80}'),
('SR-2025-USR004-' || uuid_generate_v4(), 'USR004', 92, 30, '2025-08-15',
    '{"cardiovascular": 95, "metabolic": 90, "liver": 92, "kidney": 94}'),
('SR-2025-USR005-' || uuid_generate_v4(), 'USR005', 68, 42, '2025-08-20',
    '{"cardiovascular": 65, "metabolic": 62, "liver": 70, "kidney": 75}');

-- Insert Vietnamese configuration
INSERT INTO vietnamese_config (config_key, config_value, description) VALUES
('date_format', 'DD/MM/YYYY', 'Vietnamese date format'),
('currency', 'VND', 'Vietnamese currency'),
('default_location', 'Hanoi', 'Default location for new users'),
('language_code', 'vi-VN', 'Vietnamese language code'),
('timezone', 'Asia/Ho_Chi_Minh', 'Vietnam timezone');

-- Insert demographic averages (sample data)
INSERT INTO demographic_averages (category, subcategory, average_value, sample_size, calculation_date) VALUES
('age_group', '18-25', 82.5, 150, CURRENT_DATE),
('age_group', '26-35', 78.3, 280, CURRENT_DATE),
('age_group', '36-45', 74.2, 220, CURRENT_DATE),
('age_group', '46-55', 70.1, 180, CURRENT_DATE),
('age_group', '56+', 65.8, 120, CURRENT_DATE),
('gender', 'Male', 75.2, 480, CURRENT_DATE),
('gender', 'Female', 77.8, 470, CURRENT_DATE),
('location', 'Hanoi', 76.5, 400, CURRENT_DATE),
('location', 'Ho Chi Minh City', 77.2, 350, CURRENT_DATE),
('location', 'Da Nang', 75.8, 200, CURRENT_DATE);

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed)
-- =====================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check row counts
SELECT 
    'companies' as table_name, COUNT(*) as row_count FROM companies
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'parameter_master', COUNT(*) FROM parameter_master
UNION ALL
SELECT 'parameter_categories', COUNT(*) FROM parameter_categories
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'corporate_users', COUNT(*) FROM corporate_users;

-- =====================================================
-- END OF DATABASE SETUP SCRIPT
-- =====================================================

-- Note: After running this script, update the admin and corporate user passwords
-- using bcrypt hashing in your application, as the passwords above are placeholders.
-- 
-- To generate proper bcrypt hashes, use:
-- Node.js: bcrypt.hashSync('your_password', 10)
-- Online: Use a bcrypt generator tool
--
-- Example for 'admin123':
-- UPDATE admin_users SET password = '$2b$10$8K1p/rPx.yP4ZgFYvLKEd.LqCqEbh5XnDx4YBQv5hb2yYBzAqmGCi' WHERE email = 'admin@system.com';