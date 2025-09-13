# IntelliSystem - Comprehensive Project Documentation

**Version**: 3.0.0  
**Last Updated**: August 25, 2025  
**Platform**: Health Analytics Platform  
**Production URL**: http://13.60.66.60:3000  
**API URL**: http://13.60.66.60:3001  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Frontend Components](#frontend-components)
8. [Backend Services](#backend-services)
9. [Authentication & Security](#authentication--security)
10. [Deployment Guide](#deployment-guide)
11. [Development Setup](#development-setup)
12. [Configuration Management](#configuration-management)
13. [Background Jobs & Queues](#background-jobs--queues)
14. [Internationalization](#internationalization)
15. [Health Scoring System](#health-scoring-system)
16. [Risk Assessment Modules](#risk-assessment-modules)
17. [Batch Processing System](#batch-processing-system)
18. [Monitoring & Maintenance](#monitoring--maintenance)
19. [Migration Guide](#migration-guide)
20. [Troubleshooting Guide](#troubleshooting-guide)
21. [Recent Updates](#recent-updates)

---

## Executive Summary

IntelliSystem is a comprehensive health analytics platform designed for corporate wellness programs. It provides three integrated portals:

1. **User Portal**: Individual employees access personalized health reports, risk assessments, and action plans
2. **Corporate Portal**: HR teams view company-wide health analytics and strategic planning tools
3. **Admin Portal**: System administrators manage parameters, upload batch data, and configure health scoring

### Key Features

- **Health Index V2**: Advanced scoring algorithm with configurable parameters
- **Multi-language Support**: Full English and Vietnamese translations
- **Enhanced Batch Processing**: Excel file uploads with download capability and comprehensive validation
- **Risk Assessments**: Framingham (CVD), FINDRISC (Diabetes), PHQ-9 (Depression)
- **Queue Management**: Redis-based async processing for scalability
- **Real-time Analytics**: Corporate dashboards with demographic insights
- **Action Plans**: AI-generated health improvement recommendations
- **Audit System**: Complete user deletion audit trail

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   User   │  │   Corporate  │  │       Admin         │  │
│  │  Portal  │  │    Portal    │  │      Portal         │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                   API Gateway (Express)                      │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Auth   │  │   Business   │  │      Admin          │  │
│  │  Routes  │  │    Routes    │  │     Routes          │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Health  │  │    Report    │  │      Batch          │  │
│  │  Calc    │  │   Service    │  │    Processing       │  │
│  └──────────┘  └──────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   Data Layer                                 │
│  ┌──────────────────────┐  ┌───────────────────────────┐  │
│  │    PostgreSQL DB     │  │      Redis Queue          │  │
│  │   (Primary Store)    │  │   (Job Processing)        │  │
│  └──────────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Microservices Architecture

- **Frontend Service**: Nginx serving React build
- **Backend API**: Node.js/Express REST API
- **Worker Service**: Background job processor
- **Demographic Worker**: Analytics calculation service
- **Database Service**: PostgreSQL 15/16
- **Cache Service**: Redis 7 for queues

---

## Technology Stack

### Frontend
- **Framework**: React 18.2.0
- **Routing**: React Router DOM 6.8.1
- **UI Framework**: Tailwind CSS 3.4.1
- **Animation**: Framer Motion 10.16.16
- **Icons**: Lucide React 0.294.0
- **HTTP Client**: Axios 1.6.2
- **Build Tool**: React Scripts 5.0.1

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.18.2
- **Database**: PostgreSQL 15/16 with pg 8.11.3
- **ORM/Query Builder**: Native SQL with pg driver
- **Queue System**: BullMQ 5.56.2 with Redis 7
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcrypt 5.1.1
- **File Processing**: multer 2.0.0-rc.4, xlsx 0.18.5
- **Email**: Nodemailer 6.9.7
- **Security**: Helmet 7.1.0, CORS 2.8.5

### DevOps
- **Containerization**: Docker & Docker Compose
- **Cloud Platform**: AWS EC2
- **CI/CD**: GitHub Actions
- **Process Manager**: PM2
- **Development**: Nodemon 3.0.1, Concurrently 8.2.2

---

## Project Structure

```
intelli-system/
├── client/                           # React Frontend Application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── admin/              # Admin portal components
│   │   │   │   ├── UserManagement.js (Enhanced with sorting)
│   │   │   │   └── BatchManagement.js (Download/delete features)
│   │   │   └── corporate/          # Corporate portal components
│   │   │       └── CorporateCoverPage.js (Year dropdown)
│   │   ├── contexts/               # React contexts
│   │   │   └── LanguageContext.js # i18n context
│   │   ├── translations/           # Language files
│   │   │   ├── en.json            # English translations
│   │   │   └── vi.json            # Vietnamese translations
│   │   ├── data/                  # Static data
│   │   ├── App.js                 # Main app component
│   │   └── index.js               # Entry point
│   └── package.json
│
├── server/                          # Node.js Backend Application
│   ├── app.js                      # Express app setup
│   ├── config/
│   │   └── database.js            # Database configuration
│   ├── controller/                # Request handlers
│   │   ├── adminUserController.js
│   │   ├── batchController.js    # Enhanced with download/delete
│   │   ├── categoryController.js
│   │   ├── dashboardController.js
│   │   ├── excelController.js
│   │   ├── parameterMasterController.js
│   │   ├── reportController.js
│   │   └── riskController.js
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── routes/                   # API routes
│   │   ├── admin.js              # Admin endpoints (new batch routes)
│   │   ├── auth.js               # Authentication
│   │   ├── corporate.js          # Corporate endpoints
│   │   ├── healthIndexAdmin.js  # Health config
│   │   └── reports.js            # Report endpoints
│   ├── service/                  # Business logic
│   │   ├── adminUserService.js
│   │   ├── batchService.js      # Enhanced batch processing
│   │   ├── categoryService.js
│   │   ├── dashboardService.js
│   │   ├── excelService.js
│   │   ├── healthCalculations.js
│   │   ├── healthIndexV2.js
│   │   ├── parameterMasterService.js
│   │   ├── reportService.js
│   │   └── riskService.js
│   ├── repositories/             # Data access layer
│   ├── utils/                    # Utility functions
│   │   ├── emailService.js      # Email notifications
│   │   └── generateUhid.js      # ID generation
│   ├── queues/                   # Job queues
│   │   └── excelQueue.js
│   ├── workers/                  # Background workers
│   │   ├── demographicWorker.js
│   │   └── excelWorker.js
│   ├── migrations/               # Database migrations
│   │   └── add_excel_file_path_to_batches.sql (New)
│   └── package.json
│
├── database/                      # Database files
│   ├── migrations/               # Schema migrations
│   ├── schema.sql               # Complete schema
│   └── [seed files]             # Initial data
│
├── docker-compose.yml            # Container orchestration
├── Dockerfile                    # Container definitions
├── package.json                  # Root package
└── README.md                     # Quick start guide
```

---

## Database Schema

### Core Tables (20 tables total)

#### 1. users
Primary user account information with health tracking.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | integer | PRIMARY KEY | Auto-incrementing ID |
| user_id | varchar(50) | UNIQUE NOT NULL | Unique user identifier |
| email | varchar(255) | UNIQUE NOT NULL | User email address |
| phone | varchar(20) | | Contact number |
| first_name | varchar(100) | NOT NULL | User's first name |
| last_name | varchar(100) | NOT NULL | User's last name |
| date_of_birth | date | | Birth date |
| gender | varchar(10) | CHECK | Male/Female/Other |
| company_id | varchar(50) | NOT NULL | References companies |
| password_hash | varchar(255) | | Bcrypt hashed password |
| first_login | boolean | DEFAULT true | First login flag |
| email_verified | boolean | DEFAULT false | Email verification status |
| uhid | varchar(50) | UNIQUE | Unique Health ID |
| location | varchar(100) | DEFAULT 'Hanoi' | User location |
| created_at | timestamp | DEFAULT NOW | Account creation |
| updated_at | timestamp | DEFAULT NOW | Last update |
| last_login | timestamp | | Last login time |

#### 2. companies
Organization/company information.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | integer | PRIMARY KEY | Auto-incrementing ID |
| company_id | varchar(50) | UNIQUE NOT NULL | Unique company code |
| company_name | varchar(255) | NOT NULL | Company name |
| contact_email | varchar(255) | | Company contact |
| employee_count | integer | | Total employees |
| employee_count_by_year | jsonb | | Year-wise employee counts |
| created_at | timestamp | DEFAULT NOW | Creation date |

#### 3. user_reports
Health assessment reports with scoring.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | integer | PRIMARY KEY | Auto-incrementing ID |
| report_id | varchar | UNIQUE NOT NULL | SR-YYYY-{user}-{uuid} |
| user_id | varchar(50) | FK → users | User reference |
| health_score | integer | | Calculated score (0-100) |
| biological_age | integer | | Calculated bio age |
| test_date | date | NOT NULL | Assessment date |
| report_status | varchar | DEFAULT 'active' | Status flag |
| score_breakdown | jsonb | | Detailed scoring |
| created_at | timestamp | DEFAULT NOW | Creation date |

#### 4. lab_parameters
Laboratory test results linked to reports.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| report_id | varchar | FK → user_reports | Report reference |
| parameter_name | varchar | | Test parameter |
| parameter_value | varchar | | Result value |
| unit | varchar | | Measurement unit |
| reference_min | numeric | | Normal minimum |
| reference_max | numeric | | Normal maximum |
| status | varchar | | Normal/Abnormal/etc |
| category | varchar | | Parameter category |

#### 5. parameter_master
Master list of health parameters with gender-specific ranges.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | integer | PRIMARY KEY | Auto-incrementing ID |
| parameter_id | varchar | UNIQUE NOT NULL | P1, P2, etc |
| parameter_key | varchar | NOT NULL | Display name (EN) |
| parameter_key_vi | varchar | | Display name (VI) |
| unit | varchar | | Measurement unit |
| reference_min_male | numeric | | Male minimum |
| reference_max_male | numeric | | Male maximum |
| reference_min_female | numeric | | Female minimum |
| reference_max_female | numeric | | Female maximum |
| parameter_priority | integer | DEFAULT 1 | Display order |

#### 6. batch_uploads (Enhanced)
Tracks Excel upload batches with validation and file storage.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | integer | PRIMARY KEY | Auto-incrementing ID |
| batch_id | varchar | UNIQUE NOT NULL | Batch identifier |
| filename | varchar | NOT NULL | Uploaded file |
| uploaded_by | varchar | NOT NULL | Admin user |
| status | varchar | DEFAULT 'uploaded' | Processing status |
| total_records | integer | DEFAULT 0 | Total records |
| valid_records | integer | DEFAULT 0 | Valid records |
| error_records | integer | DEFAULT 0 | Error records |
| error_details | jsonb | | Error information |
| file_path | varchar(500) | | Path for Excel download |
| created_at | timestamp | DEFAULT NOW | Upload time |

#### 7. health_index_parameters
Health Index V2 scoring configuration.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| parameter_id | varchar | UNIQUE FK | Parameter reference |
| direction | varchar(20) | CHECK | high_bad/low_bad/two_sided |
| pmax | numeric(6,2) | DEFAULT 75 | Max penalty points |
| k_full | numeric(4,3) | DEFAULT 0.25 | Width coefficient |
| weight | numeric(4,2) | DEFAULT 1.0 | Weight multiplier |
| is_active | boolean | DEFAULT true | Active status |

#### 8. admin_users
Admin portal user accounts.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| name | varchar(100) | NOT NULL | Admin name |
| email | varchar(100) | UNIQUE NOT NULL | Admin email |
| password | varchar(255) | NOT NULL | Bcrypt hash |
| role | admin_role | DEFAULT 'admin' | admin/superadmin |
| created_at | timestamp | DEFAULT NOW | Creation date |

#### 9. corporate_users
Corporate HR/Admin user accounts.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| username | varchar | UNIQUE | Login username |
| password | varchar | NOT NULL | Hashed password |
| full_name | varchar | | Display name |
| email | varchar | | Contact email |
| company_id | varchar | FK → companies | Company reference |
| role | varchar | DEFAULT 'hr' | User role |
| is_active | boolean | DEFAULT true | Account status |

#### 10. user_deletion_audit
Comprehensive audit log for user deletion operations.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | serial | PRIMARY KEY | Auto-incrementing ID |
| operation_type | varchar(50) | NOT NULL | Operation type |
| user_id | varchar(255) | | Deleted user ID |
| company_id | varchar(50) | | Company ID |
| deleted_count | integer | | Number deleted |
| deleted_by_admin_id | integer | NOT NULL | Admin who deleted |
| deleted_at | timestamp | DEFAULT NOW | Deletion time |
| ip_address | varchar(50) | | Client IP |
| additional_info | jsonb | | Extra information |

### Additional Tables (10 more tables)

- **parameter_categories**: Category groupings for parameters
- **parameter_category_mappings**: Many-to-many parameter-category relationships
- **batch_records**: Individual records within upload batches
- **health_index_combinations**: Complex parameter interaction rules
- **health_index_config_audit**: Configuration change tracking
- **risk_assessments**: User risk assessment results
- **corporate_health_metrics**: Company-wide health statistics
- **demographic_averages**: Population health benchmarks
- **email_verifications**: Email verification tokens
- **vietnamese_config**: Vietnamese-specific configuration

### Database Views

- **parameter_usage_status**: Tracks parameter usage and deletion eligibility
- **parameter_master_with_gender_ranges**: Comprehensive parameter ranges

### Key Relationships

```
users ──many-to-one──> companies
users ──one-to-many──> user_reports
user_reports ──one-to-many──> lab_parameters
parameters ──many-to-many──> categories
batch_uploads ──one-to-many──> batch_records
admin_users ──one-to-many──> user_deletion_audit
```

---

## API Documentation

### Base URLs
- **Development**: http://localhost:3001/api
- **Production**: http://13.60.66.60:3001/api

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### User Authentication Endpoints

#### POST /api/auth/login
User login with email and password.
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "user_id": "USR001",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_id": "COMP001"
  }
}
```

#### POST /api/auth/request-otp
Request OTP for passwordless login.

#### POST /api/auth/verify-otp
Verify OTP and complete login.

#### GET /api/auth/verify-token
Validate JWT token.

### Report Endpoints

#### GET /api/reports/user/:userId
Get user's health reports.

#### GET /api/reports/user/:userId/all
Get all historical reports for a user.

#### GET /api/reports/user/:userId/report/:reportId
Get specific report details.

#### GET /api/reports/parameters/:reportId
Get lab parameters for a report.

#### POST /api/reports/risk/points
Calculate risk assessment points.

#### POST /api/reports/action-plan
Generate AI action plan.

### Corporate Portal Endpoints

#### POST /api/corporate/login
Corporate user authentication.

#### GET /api/corporate/dashboard-data
Get corporate dashboard analytics.

#### GET /api/corporate/cover-data
Get corporate report cover data with year selection.

#### GET /api/corporate/available-years
Get years with available data.

#### POST /api/corporate/overview-data
Get detailed company overview with absolute values.

#### GET /api/corporate/comparison-data
Get inter-company comparison data.

#### POST /api/corporate/action-plan
Generate corporate action plan.

### Admin Portal Endpoints (Enhanced)

#### POST /api/admin/login
Admin authentication.

#### Batch Management (New Features)

##### POST /api/admin/upload
Upload Excel file with health data.
- Stores file path for later download

##### GET /api/admin/batches
List all upload batches with download capability.

##### GET /api/admin/batches/:batchId
Get batch details with error information.

##### DELETE /api/admin/batches/:batchId (NEW)
Delete a batch and all associated records.
- **Auth Required**: Yes (Admin)
- **Returns**: Deletion confirmation

##### GET /api/admin/batches/:batchId/download (NEW)
Download original Excel file for a batch.
- **Auth Required**: Yes (Admin)
- **Returns**: Excel file stream

##### POST /api/admin/batches/:batchId/approve
Approve batch for processing.

##### POST /api/admin/batches/:batchId/reject
Reject batch.

#### Parameter Management

##### GET /api/admin/parameter-master
Get all health parameters.

##### POST /api/admin/parameter-master
Create new parameter.

##### PUT /api/admin/parameter-master/:id
Update parameter.

##### DELETE /api/admin/parameter-master/:id
Delete parameter.

##### GET /api/admin/parameter-priorities
Get available priority values.

#### Company Management

##### GET /api/admin/companies
List all companies.

##### GET /api/admin/companies-with-users
Get companies with user counts.

##### POST /api/admin/companies
Create new company.

##### PUT /api/admin/companies/:companyId
Update company.

##### DELETE /api/admin/companies/:companyId
Delete company.

#### User Management (Enhanced)

##### GET /api/admin/users
List all users with sorting support.
- **Query Params**: 
  - company_id (optional)
  - sort_field (user_id, reports_count, created_at)
  - sort_direction (asc, desc)

##### GET /api/admin/users/:userId
Get user details.

##### DELETE /api/admin/users/:userId
Delete user with audit logging.

##### DELETE /api/admin/companies/:companyId/users
Delete all users in company.

##### GET /api/admin/deletion-audit
Get deletion audit logs.

#### Admin User Management

##### GET /api/admin/admin-users
List admin users.

##### POST /api/admin/admin-users
Create admin user.

##### PUT /api/admin/admin-users/:id
Update admin user.

##### DELETE /api/admin/admin-users/:id
Delete admin user.

#### Health Index Configuration

##### GET /api/admin/health-index/parameters
Get health index parameters.

##### PUT /api/admin/health-index/parameters/:parameterId
Update parameter scoring.

##### GET /api/admin/health-index/combinations
Get combination rules.

##### POST /api/admin/health-index/combinations
Create combination rule.

##### GET /api/admin/health-index/audit
Get configuration audit log.

---

## Frontend Components

### Main Application Components

#### App.js
Main application router and configuration.
- Handles routing between portals
- Manages authentication state
- Provides language context

#### LoginPage.js
User authentication interface.
- Email/password login
- OTP authentication
- Password recovery

#### CoverPage.js
Report cover page display.
- User information
- Report metadata
- Company branding

#### HealthOverview.js
Health metrics dashboard.
- Health score visualization
- Biological age display
- Key health indicators
- Trend analysis

#### ComparativeAnalysis.js
Data comparison views.
- Past vs Present comparison
- Peer comparison
- National averages
- Improved UI for missing data

#### RiskAssessment.js
Risk analysis interface.
- Framingham risk calculator
- FINDRISC diabetes assessment
- PHQ-9 depression screening
- Risk score visualization

#### ActionPlan.js
Health improvement recommendations.
- Personalized action items
- Goal setting
- Timeline management
- Progress tracking

### Admin Portal Components (Enhanced)

#### AdminDashboard.js
Main admin interface.
- System statistics
- User management
- Batch processing status
- Quick actions

#### DataUpload.js
File upload interface.
- Excel file validation
- Preview uploaded data
- Error reporting
- Batch approval workflow

#### ParameterMaster.js
Health parameter management.
- CRUD operations
- Gender-specific ranges
- Priority management
- Category assignment

#### BatchManagement.js (Enhanced)
Batch processing control with new features.
- View batch status
- Download original Excel files
- Delete batches
- Approve/reject batches
- Error detail viewing
- Reprocessing options

#### UserManagement.js (Enhanced)
User administration with sorting.
- User search and filter
- Sortable columns (User ID, Reports, Created)
- Profile editing
- Password reset
- Deletion with audit

#### HealthIndexConfig.js
Scoring configuration.
- Parameter weights
- Direction configuration
- Combination rules
- Testing interface

### Corporate Portal Components (Enhanced)

#### CorporateDashboard.js
Company health overview.
- Aggregate health scores
- Demographic breakdown
- Risk distribution
- Year-over-year comparison

#### CorporateOverview.js (Enhanced)
Detailed company analytics.
- Employee health distribution
- Parameter analysis with absolute values
- Location-based insights
- Age distribution with "(in years)" clarification
- Absolute values in brackets next to percentages

#### CorporateComparison.js
Inter-company benchmarking.
- Industry comparisons
- National benchmarks
- Trend analysis
- Performance ranking

#### CorporateActionPlan.js
Strategic health planning.
- Company-wide recommendations
- Resource allocation
- Implementation timeline
- ROI projections

#### CorporateCoverPage.js (Enhanced)
Corporate report branding with year selection.
- Company information
- Report period dropdown
- Executive summary
- Year-wise data synchronization

---

## Backend Services

### Core Services

#### healthCalculations.js
Health score calculation engine.
- Implements scoring algorithms
- Gender-specific calculations
- Penalty point system
- Score normalization

#### healthIndexV2.js
Advanced health index system.
- Configurable parameters
- Direction-aware scoring
- Combination rules
- Weight application

#### reportService.js
Report generation and management.
- Create health reports
- Calculate scores
- Generate report IDs
- Manage report lifecycle

#### riskService.js
Risk assessment calculations.
- Framingham implementation
- FINDRISC scoring
- PHQ-9 evaluation
- Risk categorization

#### excelService.js (Enhanced)
Excel file processing with storage.
- File validation
- Data extraction
- File path storage for download
- Error handling
- Batch creation

#### batchService.js (Enhanced)
Batch processing logic with delete/download.
- Validation pipeline
- Approval workflow
- Queue management
- Error aggregation
- Batch deletion with cascade
- Excel file retrieval

#### emailService.js
Email notification system.
- OTP generation
- Report delivery
- Welcome emails
- Password reset

### Repository Layer

Data access abstraction:
- Direct SQL queries
- Connection pooling
- Transaction management
- Query optimization

### Utility Functions

#### generateUhid.js
Unique Health ID generation.
- Format: UH + YYYYMMDD + 5-digit sequence
- Ensures uniqueness
- Sequential numbering

#### Authentication Middleware
JWT token validation.
- Token verification
- User extraction
- Role checking
- Token refresh

---

## Authentication & Security

### Authentication Flow

1. **User Login**
   - Email/password validation
   - Bcrypt password verification
   - JWT token generation
   - 24-hour token expiry

2. **OTP Authentication**
   - 6-digit OTP generation
   - Email delivery
   - 10-minute expiry
   - Single-use validation

3. **Token Management**
   - JWT with user payload
   - Refresh mechanism
   - Secure storage
   - Automatic renewal

### Security Measures

#### Password Security
- Bcrypt hashing (cost factor 10)
- Minimum length requirements
- Complexity validation
- No plain text storage

#### API Security
- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention

#### Data Protection
- Environment variables for secrets
- No sensitive data in logs
- Encrypted connections
- Comprehensive audit logging

### Role-Based Access Control

#### User Roles
- **User**: Individual health portal access
- **HR**: Corporate portal access
- **Admin**: System administration
- **Superadmin**: Full system control

#### Permission Matrix
| Feature | User | HR | Admin | Superadmin |
|---------|------|-----|-------|------------|
| View own reports | ✓ | - | - | ✓ |
| View company data | - | ✓ | - | ✓ |
| Upload batch data | - | - | ✓ | ✓ |
| Manage parameters | - | - | ✓ | ✓ |
| Delete users | - | - | ✓ | ✓ |
| System config | - | - | - | ✓ |
| Download batches | - | - | ✓ | ✓ |
| Delete batches | - | - | ✓ | ✓ |

---

## Deployment Guide

### Prerequisites
- Docker & Docker Compose
- AWS EC2 instance (t2.medium or larger)
- PostgreSQL 15/16
- Redis 7
- Node.js 18+
- 8GB RAM minimum
- 50GB storage

### Production Deployment

#### 1. Server Setup
```bash
# SSH to server
ssh -i HRS-key.pem ubuntu@13.60.66.60

# Navigate to project
cd ~/intelli-system
```

#### 2. Environment Configuration
```bash
# Production environment variables
DATABASE_URL=postgresql://myuser:mypassword@db:5432/mydatabase
REDIS_URL=redis://redis:6379
JWT_SECRET=production_jwt_secret
NODE_ENV=production
PORT=3001
```

#### 3. Deploy with Docker
```bash
# Pull latest code
git pull origin main

# Build and start services
docker-compose down
docker-compose up -d --build

# Verify services
docker-compose ps
```

#### 4. Database Migrations
```bash
# Run migrations
docker exec intelli-system-backend-1 node migrations/run.js

# Run new migration for batch file paths
docker exec -i intelli-system-db-1 psql -U myuser -d mydatabase < /server/migrations/add_excel_file_path_to_batches.sql

# Seed initial data
docker exec intelli-system-backend-1 node seed.js
```

### Docker Services

```yaml
services:
  frontend:
    build: ./client
    ports: "3000:80"
    
  backend:
    build: ./server
    ports: "3001:3001"
    depends_on: [db, redis]
    volumes:
      - ./uploads:/app/uploads  # For Excel file storage
    
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mydatabase
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes: postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    
  worker:
    build: ./server
    command: npm run worker
    depends_on: [db, redis]
    
  demographic-worker:
    build: ./server
    command: npm run demographic-worker
    depends_on: [db]
```

### Health Checks

```bash
# API health
curl http://13.60.66.60:3001/health

# Frontend status
curl http://13.60.66.60:3000

# Database connection
docker exec intelli-system-db-1 pg_isready

# Redis connection
docker exec intelli-system-redis-1 redis-cli ping
```

---

## Development Setup

### Local Installation

#### 1. Clone Repository
```bash
git clone [repository-url]
cd intelli-system
```

#### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

#### 3. Database Setup
```bash
# Create database
createdb smart_report

# Run migrations
psql -U postgres -d smart_report -f database/schema.sql

# Run new batch file path migration
psql -U postgres -d smart_report -f server/migrations/add_excel_file_path_to_batches.sql

# Seed data
psql -U postgres -d smart_report -f database/seed.sql
```

#### 4. Environment Variables
Create `.env` files:

**server/.env**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_report
REDIS_URL=redis://localhost:6379
JWT_SECRET=development_secret
PORT=3001
UPLOAD_DIR=./uploads
```

**client/.env**
```
REACT_APP_API_URL=http://localhost:3001
```

#### 5. Start Services
```bash
# Start all services
npm run dev

# Or individually:
# Backend
cd server && npm run dev

# Frontend
cd client && npm start

# Worker
cd server && npm run worker
```

### Development Commands

```bash
# Run tests
npm test

# Lint code
npm run lint

# Build production
npm run build

# Database console
psql -U postgres -d smart_report

# Redis console
redis-cli
```

---

## Configuration Management

### Environment Variables

#### Server Configuration
```bash
# Database
DATABASE_URL=              # PostgreSQL connection string
DB_HOST=                   # Database host
DB_PORT=                   # Database port
DB_NAME=                   # Database name
DB_USER=                   # Database user
DB_PASSWORD=               # Database password

# Redis
REDIS_URL=                 # Redis connection string
REDIS_HOST=                # Redis host
REDIS_PORT=                # Redis port

# Security
JWT_SECRET=                # JWT signing secret
BCRYPT_ROUNDS=10          # Bcrypt cost factor

# Email
SMTP_HOST=                 # SMTP server
SMTP_PORT=                 # SMTP port
SMTP_USER=                 # SMTP username
SMTP_PASSWORD=             # SMTP password
FROM_EMAIL=                # Sender email

# Application
NODE_ENV=                  # development/production
PORT=3001                  # API port
UPLOAD_LIMIT=10MB         # Max upload size
UPLOAD_DIR=./uploads      # File storage directory
```

#### Client Configuration
```bash
# API
REACT_APP_API_URL=         # Backend API URL

# Features
REACT_APP_ENABLE_OTP=true # Enable OTP login
REACT_APP_DEFAULT_LANG=en # Default language
```

### Docker Configuration

**docker-compose.yml** key settings:
- Service dependencies
- Port mappings
- Volume mounts (including uploads directory)
- Environment variables
- Health checks
- Restart policies

---

## Background Jobs & Queues

### Queue System Architecture

Using BullMQ with Redis for job processing:

#### Job Types
1. **Excel Processing**
   - File validation
   - Data extraction
   - User creation
   - Report generation
   - File path storage

2. **Demographic Calculation**
   - Age distribution
   - Gender analysis
   - Location statistics
   - Health averages

3. **Email Delivery**
   - OTP sending
   - Report delivery
   - Welcome emails
   - Notifications

### Worker Configuration

#### Excel Worker
```javascript
// Processes batch uploads
- Validates company existence
- Checks parameter validity
- Creates/updates users
- Generates reports
- Calculates health scores
- Stores file path for download
- Sends notifications
```

#### Demographic Worker
```javascript
// Updates company statistics
- Calculates averages
- Updates demographics
- Generates benchmarks
- Caches results
```

### Queue Management

```bash
# Monitor queue status
docker exec intelli-system-redis-1 redis-cli

# View queue metrics
> KEYS bull:*
> LLEN bull:excel:waiting
> LLEN bull:excel:completed

# Clear failed jobs
> DEL bull:excel:failed
```

---

## Internationalization

### Language Support

Currently supporting:
- **English (en)**: Primary language
- **Vietnamese (vi)**: Secondary language with complete translations

### Translation Structure

```javascript
// translations/en.json
{
  "common": {
    "welcome": "Welcome",
    "logout": "Logout"
  },
  "healthOverview": {
    "title": "Health Overview",
    "score": "Health Score"
  },
  "corporate": {
    "overview": {
      "ageDistribution": "By Age (in years)"
    }
  }
}
```

### Implementation

#### Language Context
```javascript
// LanguageContext.js
- Manages current language
- Provides translation function
- Handles interpolation
- Persists preference
```

#### Usage in Components
```javascript
const { t, language, setLanguage } = useLanguage();

return <h1>{t('healthOverview.title')}</h1>;
```

### Adding New Languages

1. Create translation file: `translations/[lang].json`
2. Add language option to LanguageSwitcher
3. Update backend parameter translations
4. Test all components

---

## Health Scoring System

### Health Index V2 Algorithm

#### Parameter Scoring
```javascript
// Direction-based scoring
- high_bad: Penalty for high values (e.g., cholesterol)
- low_bad: Penalty for low values (e.g., hemoglobin)
- two_sided: Penalty for deviation from range

// Penalty calculation
penalty = pmax * (1 - exp(-k * deviation^2))
```

#### Configuration Parameters
- **pmax**: Maximum penalty points (default: 75)
- **k_full**: Full width coefficient (default: 0.25)
- **weight**: Parameter importance (default: 1.0)

#### Combination Rules
- **all_out**: All parameters outside range
- **any_two**: Any two parameters abnormal
- **avg_dev_ge_t**: Average deviation exceeds threshold

### Biological Age Calculation

```javascript
biologicalAge = chronologicalAge + Σ(penalties)

Penalties based on:
- BMI ranges
- Blood pressure
- Cholesterol levels
- Glucose levels
- Lifestyle factors
```

---

## Risk Assessment Modules

### Framingham Risk Score
Calculates 10-year cardiovascular disease risk.

**Parameters**:
- Age, Gender
- Total/HDL Cholesterol
- Blood Pressure
- Smoking status
- Diabetes status

**Output**: Risk percentage and category

### FINDRISC Score
Assesses Type 2 diabetes risk.

**Parameters**:
- Age, BMI
- Waist circumference
- Physical activity
- Diet (fruits/vegetables)
- Medication history
- Family history

**Output**: Risk score (0-26) and category

### PHQ-9 Assessment
Screens for depression severity.

**Questions**: 9 standardized questions
**Scoring**: 0-27 scale
**Categories**: None, Mild, Moderate, Severe

---

## Batch Processing System (Enhanced)

### Upload Workflow

1. **File Upload**
   - Admin uploads Excel file
   - System validates format
   - Creates batch record
   - Stores file path for later download

2. **Validation Phase**
   - Company existence check
   - Parameter validation
   - Duplicate detection
   - Data type validation
   - Email format validation

3. **Preview & Approval**
   - Admin reviews errors
   - Can download original file
   - Approves or rejects batch
   - System queues for processing

4. **Processing Phase**
   - Creates/updates users
   - Generates reports
   - Calculates scores
   - Updates demographics
   - Handles duplicate emails properly

5. **Completion**
   - Sends notifications
   - Updates batch status
   - Logs completion
   - File remains available for download

### Excel Format Requirements

```
| Employee ID | Name | Email | DOB | Gender | Test Date | [Parameters...] |
|-------------|------|-------|-----|--------|-----------|-----------------|
| EMP001 | John | j@ex.com | 1990-01-01 | Male | 2025-01-15 | [Values...] |
```

### Validation Rules

- **Required Fields**: Employee ID, Name, Email, Test Date
- **Date Format**: YYYY-MM-DD
- **Gender Values**: Male, Female, Other
- **Parameter Names**: Must match parameter_master
- **Numeric Values**: Valid numbers for lab results
- **Email Format**: Valid email addresses
- **Duplicate Handling**: Proper handling of duplicate emails

---

## Monitoring & Maintenance

### Health Monitoring

#### Application Health
```bash
# Check API status
curl http://13.60.66.60:3001/health

# Check worker status
docker exec intelli-system-worker-1 ps aux

# Database connections
docker exec intelli-system-db-1 psql -U myuser -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Performance Monitoring
```bash
# CPU and Memory
docker stats

# Database performance
docker exec intelli-system-db-1 psql -U myuser -c "SELECT * FROM pg_stat_database;"

# Redis memory
docker exec intelli-system-redis-1 redis-cli INFO memory
```

### Logging

#### Application Logs
```bash
# Backend logs
docker-compose logs -f backend

# Worker logs
docker-compose logs -f worker

# Database logs
docker-compose logs -f db
```

#### Log Levels
- **ERROR**: System errors requiring attention
- **WARN**: Potential issues
- **INFO**: General information
- **DEBUG**: Detailed debugging

### Database Maintenance

#### Backup
```bash
# Create backup
docker exec intelli-system-db-1 pg_dump -U myuser mydatabase > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i intelli-system-db-1 psql -U myuser mydatabase < backup.sql
```

#### Optimization
```bash
# Vacuum and analyze
docker exec intelli-system-db-1 psql -U myuser -d mydatabase -c "VACUUM ANALYZE;"

# Reindex
docker exec intelli-system-db-1 psql -U myuser -d mydatabase -c "REINDEX DATABASE mydatabase;"
```

### Security Updates

```bash
# Update dependencies
npm audit
npm audit fix

# Update Docker images
docker-compose pull
docker-compose up -d

# System updates
sudo apt update && sudo apt upgrade
```

---

## Migration Guide

### For New Deployment

1. **Infrastructure Setup**
   - Provision AWS EC2 instance (t2.medium minimum)
   - Configure security groups (ports 3000, 3001)
   - Install Docker and Docker Compose
   - Set up domain/DNS if required

2. **Database Migration**
   - Export existing data if migrating
   - Run all schema migrations in order
   - Apply the new batch file path migration
   - Verify data integrity

3. **Configuration**
   - Set all environment variables
   - Configure email service
   - Set up SSL certificates if needed
   - Configure backup strategy

4. **Deployment**
   - Clone repository
   - Build Docker images
   - Start services
   - Run health checks

5. **Post-Deployment**
   - Create admin users
   - Configure health index parameters
   - Upload initial batch data
   - Test all three portals

### For Existing Systems

1. **Backup Current System**
   ```bash
   # Full database backup
   pg_dump -U myuser mydatabase > backup_before_migration.sql
   
   # Backup uploads directory
   tar -czf uploads_backup.tar.gz uploads/
   ```

2. **Apply Updates**
   ```bash
   # Apply new migration for batch file paths
   psql -U myuser -d mydatabase < server/migrations/add_excel_file_path_to_batches.sql
   ```

3. **Update Application**
   ```bash
   git pull origin main
   docker-compose down
   docker-compose up -d --build
   ```

4. **Verify Updates**
   - Check batch download functionality
   - Test user management sorting
   - Verify corporate year dropdown
   - Test all enhanced features

---

## Troubleshooting Guide

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
docker-compose ps db

# Verify connection string
echo $DATABASE_URL

# Test connection
docker exec -it intelli-system-db-1 psql -U myuser -d mydatabase

# Check logs
docker-compose logs db
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
docker-compose ps redis

# Test connection
docker exec -it intelli-system-redis-1 redis-cli ping

# Clear cache if needed
docker exec -it intelli-system-redis-1 redis-cli FLUSHALL
```

#### 3. Upload Validation Errors
- Verify company_id exists in companies table
- Check parameter names match parameter_master
- Ensure no duplicate entries (or handle properly)
- Validate date formats (YYYY-MM-DD)
- Check email format validity

#### 4. Batch Download Issues
- Verify file_path column exists in batch_uploads
- Check uploads directory permissions
- Ensure file exists at stored path
- Verify admin authentication

#### 5. Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

#### 6. Memory Issues
```bash
# Check memory usage
free -h
docker system df

# Clean up
docker system prune -a
docker volume prune
```

#### 7. Port Conflicts
```bash
# Check port usage
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill processes if needed
kill -9 <PID>
```

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "JWT expired" | Token timeout | Re-authenticate |
| "Company not found" | Invalid company_id | Verify company exists |
| "Parameter not found" | Unknown parameter | Check parameter_master |
| "Duplicate entry" | Unique constraint | Check duplicate handling logic |
| "Queue timeout" | Processing delay | Check worker status |
| "File not found" | Missing Excel file | Check file_path and uploads directory |
| "Sort field invalid" | Invalid sort parameter | Use valid sort fields |

---

## Recent Updates

### August 25, 2025 (Version 3.0.0)
- **Enhanced Batch Management**: Added download and delete functionality for batches
- **File Storage**: Added file_path column to batch_uploads for Excel downloads
- **User Management Sorting**: Added sortable columns (User ID, Reports, Created date)
- **Corporate Enhancements**: 
  - Year dropdown in corporate cover page
  - Age distribution header clarification "(in years)"
  - Absolute values in brackets next to percentages
- **Bug Fixes**:
  - Fixed duplicate email handling in batch processing
  - Improved gender and age chart filtering in Corporate Overview
  - Enhanced debugging for demographic data

### August 22, 2025 (Version 2.0.0)
- Created comprehensive documentation
- Consolidated PROJECT_DOCUMENTATION.md, README.md, and DATABASE_SCHEMA.md
- Added user deletion audit table
- Improved comparison page UI for missing data
- Fixed admin portal delete users functionality
- Enhanced Parameter Master with unique priority system

### August 18, 2025
- Health Index V2 implementation
- Enhanced batch processing with atomic transactions
- Parameter protection with database triggers
- Translation improvements with interpolation
- Corporate dashboard year selector
- Excel service consolidation

### August 11, 2025
- HRA calculation fixes
- Framingham risk calculator corrections
- FINDRISC parameter alignment
- Report ID format optimization

### August 9, 2025
- UI/UX improvements
- Health score animation speed increase
- Action plan HRA interface redesign
- Translation updates for both languages

---

## Appendices

### A. Database Migration Scripts

Location: `/database/migrations/` and `/server/migrations/`

Key migrations:
- `create_health_index_tables.sql`
- `add_gender_specific_ranges.sql`
- `add_vietnamese_translations.sql`
- `create_user_deletion_audit.sql`
- `add_excel_file_path_to_batches.sql` (NEW)

### B. Deployment Scripts

Location: Root directory

Scripts:
- `docker-diagnose-aws.sh`
- `find-problematic-data.sh`
- `run_optimization.sh`
- Various deployment helper scripts

### C. API Response Formats

Standard success response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Standard error response:
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### D. Health Score Ranges

| Score | Category | Description |
|-------|----------|-------------|
| 90-100 | Excellent | Optimal health |
| 75-89 | Good | Above average |
| 60-74 | Fair | Average health |
| 40-59 | Poor | Below average |
| 0-39 | Critical | Immediate attention |

### E. Support Information

For technical support or questions:
- Review this documentation
- Check troubleshooting guide
- Contact development team
- Create GitHub issue

---

## License & Legal

**Proprietary Software**
Copyright © 2025 IntelliSystem
All rights reserved.

This software and documentation are proprietary and confidential.
Unauthorized copying, distribution, or use is strictly prohibited.

---

*End of Documentation - Version 3.0.0*
*Last Updated: August 25, 2025*
*Total Pages: Comprehensive coverage of entire system with all recent enhancements*