# IntelliSystem - Complete Deployment Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Infrastructure Setup](#aws-infrastructure-setup)
4. [Server Setup](#server-setup)
5. [Application Deployment](#application-deployment)
6. [Configuration](#configuration)
7. [Data Migration](#data-migration)
8. [SSL & Domain Setup](#ssl--domain-setup)
9. [Testing & Validation](#testing--validation)
10. [Maintenance & Operations](#maintenance--operations)
11. [Troubleshooting](#troubleshooting)
12. [Security Checklist](#security-checklist)

---

## System Overview

### Architecture Components
- **Frontend**: React application (Port 3000)
- **Backend**: Node.js/Express API (Port 3001)
- **Database**: PostgreSQL 15 (Port 5436 → 5432 internally)
- **Cache**: Redis 7 (Port 6379)
- **Worker Services**: Background job processors
- **Demographic Worker**: Data processing service

### Technology Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion
- **Backend**: Node.js 20, Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Container**: Docker & Docker Compose
- **Proxy**: Nginx (for production)

---

## Prerequisites

### Required Access
- GitHub repository access: `https://github.com/anilkumar1510/intelli-system`
- AWS Account with appropriate permissions
- Domain name (optional but recommended)

### Required Knowledge
- Basic Linux/Ubuntu administration
- Docker and Docker Compose
- Basic networking concepts
- PostgreSQL basics

---

## AWS Infrastructure Setup

### 1. EC2 Instance Specifications

#### Minimum Requirements (Development/Testing)
```
Instance Type: t3.medium
vCPUs: 2
RAM: 4 GB
Storage: 30 GB SSD (gp3)
OS: Ubuntu 24.04 LTS
```

#### Recommended Requirements (Production)
```
Instance Type: t3.large or t3.xlarge
vCPUs: 2-4
RAM: 8-16 GB
Storage: 100 GB SSD (gp3)
OS: Ubuntu 24.04 LTS
```

### 2. Create EC2 Instance

1. **Login to AWS Console** → EC2 → Launch Instance

2. **Configure Instance:**
   ```
   Name: intelli-system-production
   AMI: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type
   Instance Type: t3.large
   Key Pair: Create new → "intelli-system-key"
   ```

3. **Network Settings:**
   ```
   VPC: Default or create new
   Subnet: Public subnet
   Auto-assign public IP: Enable
   ```

4. **Storage:**
   ```
   Root volume: 100 GB gp3
   Delete on termination: No (for production)
   ```

5. **Advanced Details:**
   ```bash
   # Add to User Data script:
   #!/bin/bash
   apt-get update
   apt-get upgrade -y
   ```

### 3. Security Group Configuration

Create security group: `intelli-system-sg`

#### Inbound Rules:
```
Type            Protocol    Port Range    Source          Description
SSH             TCP         22           Your IP         Admin access
HTTP            TCP         80           0.0.0.0/0       Web traffic
HTTPS           TCP         443          0.0.0.0/0       Secure web traffic
Custom TCP      TCP         3000         0.0.0.0/0       Frontend (dev)
Custom TCP      TCP         3001         0.0.0.0/0       Backend API (dev)
PostgreSQL      TCP         5436         VPC CIDR        Database
Redis           TCP         6379         VPC CIDR        Cache
```

#### Outbound Rules:
```
Type            Protocol    Port Range    Destination     Description
All traffic     All         All          0.0.0.0/0       Allow all outbound
```

### 4. Elastic IP (Recommended for Production)

1. EC2 → Elastic IPs → Allocate Elastic IP address
2. Actions → Associate Elastic IP address → Select your instance
3. Note down the Elastic IP for DNS configuration

---

## Server Setup

### 1. Connect to Server

```bash
# Set correct permissions for key file
chmod 400 intelli-system-key.pem

# Connect via SSH
ssh -i intelli-system-key.pem ubuntu@YOUR_SERVER_IP
```

### 2. Initial System Setup

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Set timezone
sudo timedatectl set-timezone Asia/Ho_Chi_Minh  # Or your timezone

# Install essential packages
sudo apt-get install -y \
    curl \
    wget \
    vim \
    git \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    net-tools \
    ufw
```

### 3. Install Docker

```bash
# Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Activate changes
newgrp docker

# Verify installation
docker --version
```

### 4. Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symbolic link
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker-compose --version
```

### 5. Install Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

### 6. Configure Firewall

```bash
# Enable UFW
sudo ufw --force enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports (for development)
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Check status
sudo ufw status
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/intelli-system
sudo chown -R $USER:$USER /opt/intelli-system
cd /opt

# Clone repository (replace with your repository URL)
git clone https://github.com/anilkumar1510/intelli-system.git
cd intelli-system
```

### 2. Environment Configuration

```bash
# Create .env file
cat > .env << 'EOF'
# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_USER=intelliuser
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_$(openssl rand -base64 32)
DB_NAME=intellidb

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Application Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 64)

# Frontend Configuration (Update with your actual domain/IP)
REACT_APP_API_URL=http://YOUR_DOMAIN_OR_IP/api

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS Configuration (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-southeast-1

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Set proper permissions
chmod 600 .env
```

### 3. Docker Compose Configuration

Create production docker-compose file:

```bash
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: intelli-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5436:5432"
    networks:
      - intelli-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7
    container_name: intelli-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - intelli-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: intelli-backend
    restart: unless-stopped
    env_file: .env
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./server:/app
      - /app/node_modules
    networks:
      - intelli-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  frontend:
    build:
      context: .
      dockerfile: client/Dockerfile
      args:
        - REACT_APP_API_URL=${REACT_APP_API_URL}
    container_name: intelli-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./client:/app
      - /app/node_modules
    networks:
      - intelli-network

  worker:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: intelli-worker
    restart: unless-stopped
    command: node worker.js
    env_file: .env
    depends_on:
      - db
      - redis
    volumes:
      - ./server:/app
      - /app/node_modules
    networks:
      - intelli-network

  demographic-worker:
    build:
      context: .
      dockerfile: server/Dockerfile
    container_name: intelli-demographic-worker
    restart: unless-stopped
    command: node demographicWorker.js
    env_file: .env
    depends_on:
      - db
      - redis
    volumes:
      - ./server:/app
      - /app/node_modules
    networks:
      - intelli-network

volumes:
  postgres_data:
  redis_data:

networks:
  intelli-network:
    driver: bridge
EOF
```

### 4. Build and Deploy

```bash
# Build all Docker images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Initialize Database

```bash
# Wait for database to be ready
sleep 30

# Create database schema (if init.sql doesn't exist)
docker exec -it intelli-db psql -U intelliuser -d intellidb << 'EOF'
-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add more tables as needed
EOF

# Verify database
docker exec -it intelli-db psql -U intelliuser -d intellidb -c "\dt"
```

---

## Configuration

### 1. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/intelli-system
```

Add the following configuration:

```nginx
# HTTP Server - Redirect to HTTPS (if SSL configured)
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;
    
    # For SSL setup later
    # return 301 https://$server_name$request_uri;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for long operations
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # File upload size
    client_max_body_size 100M;
}
```

Enable the configuration:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/intelli-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 2. Update Frontend API URL

```bash
# Update .env file with correct API URL
sed -i 's|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://YOUR_DOMAIN_OR_IP/api|' .env

# Rebuild frontend with new API URL
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

---

## Data Migration

### 1. Export Data from Source Database (if applicable)

```bash
# On source server
docker exec SOURCE_DB_CONTAINER pg_dump -U username -d dbname > backup.sql

# Transfer to new server
scp backup.sql ubuntu@NEW_SERVER_IP:/tmp/
```

### 2. Import Data to New Database

```bash
# Import data
docker exec -i intelli-db psql -U intelliuser -d intellidb < /tmp/backup.sql

# Verify import
docker exec -it intelli-db psql -U intelliuser -d intellidb -c "SELECT COUNT(*) FROM users;"
```

---

## SSL & Domain Setup

### 1. Point Domain to Server
- Add A record in DNS: `YOUR_DOMAIN.com → YOUR_SERVER_IP`
- Add A record for www: `www.YOUR_DOMAIN.com → YOUR_SERVER_IP`

### 2. Install SSL Certificate

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### 3. Update Configuration for HTTPS

Update `/etc/nginx/sites-available/intelli-system`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rest of configuration (location blocks)...
}
```

---

## Testing & Validation

### 1. Health Checks

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# Backend health
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000

# Database connection
docker exec -it intelli-db psql -U intelliuser -d intellidb -c "SELECT 1;"

# Redis connection
docker exec -it intelli-redis redis-cli ping
```

### 2. Application Testing

```bash
# Test user login (adjust based on your API)
curl -X POST http://YOUR_DOMAIN/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test data retrieval
curl http://YOUR_DOMAIN/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create Test Accounts

```bash
# Access database
docker exec -it intelli-db psql -U intelliuser -d intellidb

# Create test admin user
INSERT INTO admin_users (username, email, password, role) 
VALUES ('admin', 'admin@company.com', 'hashed_password', 'superadmin');

# Create test corporate user
INSERT INTO corporate_users (username, company_id, email, password) 
VALUES ('corpuser', 1, 'corp@company.com', 'hashed_password');
```

---

## Maintenance & Operations

### 1. Backup Setup

Create backup script:

```bash
sudo nano /opt/intelli-system/backup.sh
```

```bash
#!/bin/bash
# Backup script for IntelliSystem

# Configuration
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker exec intelli-db pg_dump -U intelliuser intellidb | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /opt/intelli-system . --exclude=node_modules --exclude=.git

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/
# aws s3 cp $BACKUP_DIR/app_backup_$DATE.tar.gz s3://your-backup-bucket/

# Remove old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/intelli-system/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/intelli-system/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

### 2. Monitoring Setup

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Docker stats monitoring
docker stats --no-stream

# Create monitoring script
cat > /opt/intelli-system/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Resources ==="
free -h
df -h
echo ""
echo "=== Docker Containers ==="
docker-compose -f /opt/intelli-system/docker-compose.prod.yml ps
echo ""
echo "=== Container Resources ==="
docker stats --no-stream
EOF

chmod +x /opt/intelli-system/monitor.sh
```

### 3. Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Setup log rotation
cat > /etc/logrotate.d/docker-intelli << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    delaycompress
    missingok
    notifempty
    maxsize 10M
}
EOF
```

### 4. Update Procedures

Create update script:

```bash
cat > /opt/intelli-system/update.sh << 'EOF'
#!/bin/bash
cd /opt/intelli-system

# Backup before update
./backup.sh

# Pull latest code
git pull origin main

# Update containers
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
# docker exec -it intelli-backend npm run migrate

echo "Update completed"
EOF

chmod +x /opt/intelli-system/update.sh
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Rebuild specific service
docker-compose -f docker-compose.prod.yml build --no-cache [service-name]
docker-compose -f docker-compose.prod.yml up -d [service-name]
```

#### 2. Database Connection Issues
```bash
# Check database is running
docker ps | grep intelli-db

# Test connection
docker exec -it intelli-db psql -U intelliuser -d intellidb

# Check environment variables
docker exec intelli-backend env | grep DB_
```

#### 3. Frontend Can't Connect to Backend
```bash
# Check backend is accessible
curl http://localhost:3001/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Check CORS settings in backend
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Clear Docker cache
docker system prune -a --volumes
```

#### 5. Port Conflicts
```bash
# Check ports in use
sudo netstat -tulpn | grep LISTEN

# Stop conflicting service or change port in docker-compose.prod.yml
```

### Emergency Recovery

```bash
# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Restore from backup
gunzip < /opt/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i intelli-db psql -U intelliuser intellidb

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Security Checklist

### Essential Security Steps

- [ ] **Change all default passwords** in .env file
- [ ] **Generate new JWT secret**: `openssl rand -base64 64`
- [ ] **Configure firewall** (UFW) with minimal open ports
- [ ] **Enable SSH key-only authentication**:
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  sudo systemctl restart ssh
  ```
- [ ] **Setup fail2ban** for brute force protection:
  ```bash
  sudo apt-get install fail2ban
  sudo systemctl enable fail2ban
  ```
- [ ] **Regular security updates**:
  ```bash
  sudo apt-get update && sudo apt-get upgrade
  ```
- [ ] **Configure SSL/TLS** for all web traffic
- [ ] **Set secure headers** in Nginx configuration
- [ ] **Limit database access** to application only
- [ ] **Remove test/demo accounts** from production
- [ ] **Enable audit logging**
- [ ] **Setup backup encryption** for sensitive data
- [ ] **Configure AWS Security Groups** properly
- [ ] **Enable CloudWatch monitoring** (AWS)
- [ ] **Set up IAM roles** with minimal permissions
- [ ] **Configure secrets management** (AWS Secrets Manager)
- [ ] **Regular security scans** and updates

### Production Readiness Checklist

- [ ] All services running with `restart: unless-stopped`
- [ ] Health checks configured for all services
- [ ] Monitoring and alerting setup
- [ ] Backup strategy implemented and tested
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Disaster recovery plan documented
- [ ] Support contacts established

---

## Support Information

### System Requirements Summary
- **OS**: Ubuntu 24.04 LTS
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Node.js**: 20.x (in containers)
- **PostgreSQL**: 15
- **Redis**: 7

### Default Ports
- Frontend: 3000 (proxied through Nginx 80/443)
- Backend: 3001 (proxied through Nginx)
- PostgreSQL: 5436 (internal: 5432)
- Redis: 6379 (internal only)

### Useful Commands Reference
```bash
# View all containers
docker-compose -f docker-compose.prod.yml ps

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Execute command in container
docker exec -it [container-name] [command]

# Database access
docker exec -it intelli-db psql -U intelliuser -d intellidb

# Redis CLI
docker exec -it intelli-redis redis-cli

# System monitoring
htop
docker stats
df -h
free -h
```

### Maintenance Windows
- **Backups**: Daily at 2:00 AM (server time)
- **Updates**: Schedule during low-traffic periods
- **Health checks**: Every 30 seconds (automated)

---

## Contact & Support

For technical issues or questions regarding this deployment:

1. Check the troubleshooting section above
2. Review application logs for errors
3. Consult the GitHub repository documentation
4. Contact the development team

### Repository Information
- **GitHub**: https://github.com/anilkumar1510/intelli-system
- **Documentation**: Available in repository README.md
- **Issues**: Report via GitHub Issues

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-11 | Initial deployment guide |

---

## License & Legal

This deployment guide is provided as-is for the IntelliSystem project. Ensure compliance with all applicable licenses and regulations in your jurisdiction.

---

**Document Generated**: January 11, 2025
**Last Updated**: January 11, 2025
**Prepared for**: IntelliSystem Production Deployment