# IntelliSystem Migration Guide

**Document Version**: 1.0  
**Date**: August 26, 2025  
**Purpose**: Technical migration guide for deploying IntelliSystem 

---

## Executive Overview

IntelliSystem is a comprehensive health analytics platform with three integrated portals:
- **User Portal**: Employee health reports and assessments
- **Corporate Portal**: Company-wide health analytics dashboard
- **Admin Portal**: System administration and batch data processing

### Technology Stack
- **Frontend**: React 18.2 with Tailwind CSS
- **Backend**: Node.js 18+ with Express 4.18
- **Database**: PostgreSQL 15/16
- **Queue System**: Redis 7 with BullMQ
- **Container**: Docker & Docker Compose

---

## Pre-Migration Requirements

### Infrastructure
- **Server**: Minimum t2.medium EC2 or equivalent (8GB RAM, 50GB storage)
- **Ports**: 3000 (Frontend), 3001 (Backend API), 5432 (PostgreSQL), 6379 (Redis)
- **Software**: Docker, Docker Compose, Git
- **Domain**: Optional, for production URL mapping

### Access Requirements
- SSH access to target server
- Database admin privileges
- Docker hub access (for base images)

---

## Migration Steps

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
# Clone the repository
git clone https://github.com/anilkumar1510/intelli-system.git
cd intelli-system
```

### 3. Environment Configuration

Create production environment files:

**Backend Configuration** (`server/.env`):
```env
# Database
DATABASE_URL=postgresql://myuser:mypassword@db:5432/mydatabase
DB_HOST=db
DB_PORT=5432
DB_NAME=mydatabase
DB_USER=myuser
DB_PASSWORD=mypassword

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=<generate-secure-random-string>
BCRYPT_ROUNDS=10

# Email Service (Configure with your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Application
NODE_ENV=production
PORT=3001
UPLOAD_DIR=./uploads
```

**Frontend Configuration** (`client/.env`):
```env
REACT_APP_API_URL=http://your-server-ip:3001
```

### 4. Docker Deployment

**Modify docker-compose.yml** for production:
```yaml
version: '3.8'
services:
  frontend:
    build: ./client
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://your-server-ip:3001
    restart: unless-stopped

  backend:
    build: ./server
    ports:
      - "3001:3001"
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
    env_file:
      - ./server/.env
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mydatabase
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  worker:
    build: ./server
    command: npm run worker
    depends_on:
      - db
      - redis
    env_file:
      - ./server/.env
    restart: unless-stopped

  demographic-worker:
    build: ./server
    command: npm run demographic-worker
    depends_on:
      - db
    env_file:
      - ./server/.env
    restart: unless-stopped

volumes:
  postgres_data:
```

### 5. Build and Deploy

```bash
# Build all services
docker-compose build

# Start services in detached mode
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### 6. Database Initialization

```bash
# Wait for database to be ready
sleep 10

# Run database migrations
docker exec -i intelli-system-db-1 psql -U myuser -d mydatabase < database/schema.sql

# Apply additional migrations
docker exec -i intelli-system-db-1 psql -U myuser -d mydatabase < server/migrations/add_excel_file_path_to_batches.sql

# Seed initial data (optional)
docker exec -i intelli-system-db-1 psql -U myuser -d mydatabase < database/seed.sql
```

### 7. Create Initial Admin User

```bash
# Connect to database
docker exec -it intelli-system-db-1 psql -U myuser -d mydatabase

# Create admin user (in psql prompt)
INSERT INTO admin_users (name, email, password, role) 
VALUES ('Admin Name', 'admin@yourdomain.com', '$2b$10$YourBcryptHashHere', 'superadmin');

# Exit psql
\q
```

### 8. Health Verification

```bash
# Check API health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000

# Check database connectivity
docker exec intelli-system-db-1 pg_isready

# Check Redis
docker exec intelli-system-redis-1 redis-cli ping

# View logs if needed
docker-compose logs -f backend
```

---

## Database Schema

### Complete Database Structure

The system uses PostgreSQL with 20 tables. Below is the complete schema:

```sql
-- 1. Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    employee_count INTEGER,
    employee_count_by_year JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    company_id VARCHAR(50) NOT NULL REFERENCES companies(company_id),
    password_hash VARCHAR(255),
    first_login BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    uhid VARCHAR(50) UNIQUE,
    location VARCHAR(100) DEFAULT 'Hanoi',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Reports table
CREATE TABLE user_reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    biological_age INTEGER,
    test_date DATE NOT NULL,
    report_status VARCHAR(20) DEFAULT 'active',
    score_breakdown JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parameter Master table
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
    parameter_priority INTEGER DEFAULT 1
);

-- 5. Lab Parameters table
CREATE TABLE lab_parameters (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(100) REFERENCES user_reports(report_id) ON DELETE CASCADE,
    parameter_name VARCHAR(100),
    parameter_value VARCHAR(50),
    unit VARCHAR(50),
    reference_min NUMERIC(10,2),
    reference_max NUMERIC(10,2),
    status VARCHAR(20),
    category VARCHAR(50)
);

-- 6. Parameter Categories table
CREATE TABLE parameter_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_name_vi VARCHAR(100),
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- 7. Parameter Category Mappings table
CREATE TABLE parameter_category_mappings (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20) REFERENCES parameter_master(parameter_id),
    category_id VARCHAR(20) REFERENCES parameter_categories(category_id),
    UNIQUE(parameter_id, category_id)
);

-- 8. Health Index Parameters table
CREATE TABLE health_index_parameters (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20) UNIQUE REFERENCES parameter_master(parameter_id),
    direction VARCHAR(20) CHECK (direction IN ('high_bad', 'low_bad', 'two_sided')),
    pmax NUMERIC(6,2) DEFAULT 75,
    k_full NUMERIC(4,3) DEFAULT 0.25,
    weight NUMERIC(4,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true
);

-- 9. Health Index Combinations table
CREATE TABLE health_index_combinations (
    id SERIAL PRIMARY KEY,
    combination_name VARCHAR(100),
    rule_type VARCHAR(50),
    parameters TEXT[],
    threshold NUMERIC(10,2),
    penalty NUMERIC(6,2),
    is_active BOOLEAN DEFAULT true
);

-- 10. Health Index Config Audit table
CREATE TABLE health_index_config_audit (
    id SERIAL PRIMARY KEY,
    parameter_id VARCHAR(20),
    changed_by INTEGER,
    change_type VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Batch Uploads table
CREATE TABLE batch_uploads (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'uploaded',
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    error_details JSONB,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Batch Records table
CREATE TABLE batch_records (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) REFERENCES batch_uploads(batch_id) ON DELETE CASCADE,
    row_number INTEGER,
    user_data JSONB,
    validation_status VARCHAR(20),
    error_message TEXT,
    processed BOOLEAN DEFAULT false
);

-- 13. Admin Users table
CREATE TYPE admin_role AS ENUM ('admin', 'superadmin');
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role admin_role DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Corporate Users table
CREATE TABLE corporate_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    company_id VARCHAR(50) REFERENCES companies(company_id),
    role VARCHAR(20) DEFAULT 'hr',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Risk Assessments table
CREATE TABLE risk_assessments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    assessment_type VARCHAR(50),
    assessment_date DATE,
    risk_score NUMERIC(10,2),
    risk_category VARCHAR(50),
    assessment_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Corporate Health Metrics table
CREATE TABLE corporate_health_metrics (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(company_id),
    metric_date DATE,
    total_employees INTEGER,
    health_checks_completed INTEGER,
    average_health_score NUMERIC(5,2),
    risk_distribution JSONB,
    demographic_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Demographic Averages table
CREATE TABLE demographic_averages (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50),
    subcategory VARCHAR(50),
    average_value NUMERIC(10,2),
    sample_size INTEGER,
    calculation_date DATE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Email Verifications table
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. User Deletion Audit table
CREATE TABLE user_deletion_audit (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    company_id VARCHAR(50),
    deleted_count INTEGER,
    deleted_by_admin_id INTEGER REFERENCES admin_users(id),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    additional_info JSONB
);

-- 20. Vietnamese Config table (for localization)
CREATE TABLE vietnamese_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX idx_user_reports_test_date ON user_reports(test_date);
CREATE INDEX idx_lab_parameters_report_id ON lab_parameters(report_id);
CREATE INDEX idx_batch_records_batch_id ON batch_records(batch_id);
CREATE INDEX idx_risk_assessments_user_id ON risk_assessments(user_id);

-- Create views
CREATE VIEW parameter_usage_status AS
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
```

### Database Connection Configuration

The application uses the following connection parameters:

```javascript
// Database connection pool configuration
{
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mydatabase',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

---

## Post-Migration Configuration

### 1. Configure Health Index Parameters

Access the admin portal and configure:
- Parameter scoring weights
- Direction settings (high_bad, low_bad, two_sided)
- Combination rules for complex scoring

### 2. Set Up Companies

Create company records for your organizations:
```sql
INSERT INTO companies (company_id, company_name, contact_email, employee_count)
VALUES ('COMP001', 'Your Company Name', 'hr@company.com', 500);
```

### 3. Configure Email Service

Update SMTP settings in the environment file for:
- OTP delivery
- Report notifications
- Password reset emails

### 4. Upload Initial Data

Use the admin portal to:
- Upload parameter master data
- Import employee records via Excel
- Configure risk assessment thresholds

---

## Backup and Recovery

### Daily Backup Script

Create `/home/ubuntu/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec intelli-system-db-1 pg_dump -U myuser mydatabase > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploads directory
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz ./intelli-system/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Restore Procedure

```bash
# Restore database
docker exec -i intelli-system-db-1 psql -U myuser mydatabase < /path/to/backup.sql

# Restore uploads
tar -xzf /path/to/uploads_backup.tar.gz -C ./intelli-system/
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Create health check script
cat > /home/ubuntu/health_check.sh << 'EOF'
#!/bin/bash
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ $API_STATUS -ne 200 ]; then
    echo "API health check failed"
    docker-compose restart backend
fi
EOF

chmod +x /home/ubuntu/health_check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/ubuntu/health_check.sh
```

### Log Management

```bash
# View logs
docker-compose logs -f backend          # API logs
docker-compose logs -f worker           # Worker logs
docker-compose logs -f demographic-worker # Demographics processor

# Log rotation (add to docker-compose.yml)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---


---



### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 [service_name]

# Restart specific service
docker-compose restart [service_name]

# Database connectivity test
docker exec intelli-system-db-1 pg_isready -U myuser

# Redis connectivity test
docker exec intelli-system-redis-1 redis-cli ping
```

---



### Architecture Overview
```
├── Frontend (React) → Port 3000
├── Backend API (Express) → Port 3001
├── PostgreSQL Database → Port 5432
├── Redis Queue → Port 6379
├── Worker Service (Background jobs)
└── Demographic Worker (Analytics)
```

---

## Migration Checklist

- [ ] Server infrastructure ready
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Docker services built and running
- [ ] Database initialized
- [ ] Admin user created
- [ ] Health checks passing
- [ ] Email service configured
- [ ] Backup system implemented
- [ ] Monitoring configured
- [ ] Security measures applied
- [ ] Initial data uploaded
- [ ] All three portals accessible
- [ ] Test data processing working

---
