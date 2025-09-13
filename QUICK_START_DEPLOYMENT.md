# IntelliSystem - Quick Start Deployment Guide

## 🚀 30-Minute Deployment Guide

This guide helps you deploy IntelliSystem quickly on a fresh Ubuntu server.

### Prerequisites
- Ubuntu 24.04 server with root/sudo access
- GitHub repository access
- At least 4GB RAM, 30GB storage

---

## Step 1: Server Preparation (5 minutes)

```bash
# Connect to your server
ssh ubuntu@YOUR_SERVER_IP

# Run this one-liner to install everything needed:
curl -fsSL https://get.docker.com -o get-docker.sh && \
sudo sh get-docker.sh && \
sudo usermod -aG docker $USER && \
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
sudo chmod +x /usr/local/bin/docker-compose && \
sudo apt-get update && \
sudo apt-get install -y git nginx && \
newgrp docker
```

---

## Step 2: Get the Code (2 minutes)

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/anilkumar1510/intelli-system.git
sudo chown -R $USER:$USER intelli-system
cd intelli-system
```

---

## Step 3: Quick Configuration (3 minutes)

```bash
# Create .env file with auto-generated passwords
cat > .env << EOF
# Database
DB_HOST=db
DB_PORT=5432
DB_USER=intelliuser
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_NAME=intellidb

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Update this with your server IP or domain
REACT_APP_API_URL=http://$(curl -s ifconfig.me)/api
EOF

echo "✅ Environment configured. Save these credentials:"
echo "-------------------------------------------"
grep PASSWORD .env
grep JWT_SECRET .env
echo "-------------------------------------------"
```

---

## Step 4: Deploy Application (10 minutes)

```bash
# Build and start all services
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check status
docker-compose ps
```

---

## Step 5: Configure Nginx (5 minutes)

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/intelli-system > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable configuration
sudo ln -sf /etc/nginx/sites-available/intelli-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 6: Create Initial Admin User (2 minutes)

```bash
# Create admin user
docker exec -it intelli-system-backend-1 node -e "
const bcrypt = require('bcrypt');
const password = 'Admin@123';
bcrypt.hash(password, 10).then(hash => {
  console.log('Password hash:', hash);
  console.log('Username: admin');
  console.log('Password: Admin@123');
});"

# Note the hash and create admin user in database
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb << 'EOF'
-- Create admin user (replace YOUR_HASH with the hash from above)
INSERT INTO admin_users (username, email, password, role, created_at) 
VALUES ('admin', 'admin@company.com', '$2b$10$YOUR_HASH_HERE', 'superadmin', NOW())
ON CONFLICT (username) DO NOTHING;
EOF
```

---

## Step 7: Verify Deployment (3 minutes)

```bash
# Test endpoints
echo "🔍 Testing deployment..."

# Check backend health
curl -s http://localhost:3001/health && echo " ✅ Backend is running" || echo " ❌ Backend issue"

# Check frontend
curl -s http://localhost:3000 > /dev/null && echo " ✅ Frontend is running" || echo " ❌ Frontend issue"

# Check database
docker exec intelli-system-db-1 psql -U intelliuser -d intellidb -c "SELECT 1" > /dev/null 2>&1 && echo " ✅ Database is running" || echo " ❌ Database issue"

# Check Redis
docker exec intelli-system-redis-1 redis-cli ping > /dev/null 2>&1 && echo " ✅ Redis is running" || echo " ❌ Redis issue"

echo ""
echo "🎉 Deployment Complete!"
echo "========================"
echo "Access your application at: http://$(curl -s ifconfig.me)"
echo "Admin login: admin / Admin@123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
```

---

## 🛠️ Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop Services
```bash
docker-compose down
```

### Start Services
```bash
docker-compose up -d
```

### Update Application
```bash
cd /opt/intelli-system
git pull
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
docker exec intelli-system-db-1 pg_dump -U intelliuser intellidb > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker exec -i intelli-system-db-1 psql -U intelliuser intellidb < backup.sql
```

---

## 🚨 Troubleshooting

### Container won't start
```bash
docker-compose logs [service-name]
docker-compose down
docker-compose up -d
```

### Port already in use
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process or change ports in docker-compose.yml
```

### Database connection issues
```bash
# Check if database is running
docker ps | grep db

# Test connection
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb
```

### Out of memory
```bash
# Check memory
free -h

# Clean Docker
docker system prune -a --volumes
```

---

## 📋 Post-Deployment Checklist

- [ ] Change admin password
- [ ] Configure firewall (ufw)
- [ ] Set up SSL certificate (if using domain)
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Update REACT_APP_API_URL with actual domain
- [ ] Remove test/demo accounts
- [ ] Enable security headers in Nginx
- [ ] Configure log rotation

---

## 📞 Need Help?

1. Check the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions
2. Review logs: `docker-compose logs -f`
3. Check GitHub issues
4. Verify all services are running: `docker-compose ps`

---

**Quick deployment typically takes 30 minutes.**
**For production environments, please follow the complete DEPLOYMENT_GUIDE.md**