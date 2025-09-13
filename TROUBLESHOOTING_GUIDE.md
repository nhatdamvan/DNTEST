# IntelliSystem Troubleshooting Guide

## Quick Diagnosis Commands

```bash
# Check all services status
docker-compose ps

# Check system resources
free -h && df -h

# Check Docker logs
docker-compose logs --tail=50

# Check specific service
docker-compose logs --tail=100 backend
```

---

## Common Issues & Solutions

### 1. Application Won't Start

#### Symptom: Containers keep restarting
```bash
# Check logs for the failing container
docker-compose logs [service-name]
```

**Common Causes & Solutions:**

**A. Port already in use**
```bash
# Check what's using the ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5436

# Solution 1: Kill the process
sudo kill -9 [PID]

# Solution 2: Change ports in docker-compose.yml
```

**B. Environment variables missing**
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables
docker-compose config

# Solution: Create/update .env file
cp .env.example .env
nano .env
```

**C. Docker daemon issues**
```bash
# Restart Docker
sudo systemctl restart docker

# Check Docker status
sudo systemctl status docker
```

---

### 2. Database Connection Issues

#### Symptom: "ECONNREFUSED" or "Connection refused"

**Check database container:**
```bash
# Is database running?
docker ps | grep db

# Check database logs
docker-compose logs db

# Test connection
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb
```

**Solutions:**

**A. Database not initialized**
```bash
# Restart database with clean volume
docker-compose down
docker volume rm intelli-system_postgres_data
docker-compose up -d db
# Wait 30 seconds
docker-compose up -d
```

**B. Wrong credentials**
```bash
# Check environment variables match
grep DB_ .env
docker exec backend env | grep DB_

# Update and restart
docker-compose down
# Fix .env file
docker-compose up -d
```

**C. Network issues**
```bash
# Check if containers are on same network
docker network ls
docker inspect intelli-system-backend-1 | grep NetworkMode
docker inspect intelli-system-db-1 | grep NetworkMode

# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

---

### 3. Frontend Can't Connect to Backend

#### Symptom: "Network Error" or "CORS error"

**Diagnosis:**
```bash
# Test backend directly
curl http://localhost:3001/health

# Check Nginx proxy
curl http://localhost/api/health

# Check browser console for errors
```

**Solutions:**

**A. Wrong API URL**
```bash
# Check frontend environment
docker exec frontend env | grep REACT_APP_API_URL

# Update and rebuild
# Edit .env file
docker-compose build frontend
docker-compose up -d frontend
```

**B. CORS issues**
```bash
# Check backend CORS settings
docker exec -it backend grep -r "cors" /app

# Add CORS headers in Nginx
sudo nano /etc/nginx/sites-available/intelli-system
# Add headers:
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';

sudo nginx -t && sudo systemctl reload nginx
```

**C. Nginx misconfiguration**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

---

### 4. Memory/Performance Issues

#### Symptom: Slow response, containers crashing

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats

# Check disk space
df -h

# Check CPU usage
top
```

**Solutions:**

**A. Out of memory**
```bash
# Clean Docker resources
docker system prune -a --volumes

# Restart with memory limits
# Add to docker-compose.yml:
services:
  backend:
    mem_limit: 512m
    memswap_limit: 1g
```

**B. Database optimization**
```bash
# Check slow queries
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb

# In psql:
SELECT * FROM pg_stat_activity WHERE state != 'idle';

# Add indexes if needed
CREATE INDEX idx_users_email ON users(email);
```

**C. Redis memory issues**
```bash
# Check Redis memory
docker exec -it intelli-system-redis-1 redis-cli INFO memory

# Clear Redis cache
docker exec -it intelli-system-redis-1 redis-cli FLUSHALL
```

---

### 5. SSL/HTTPS Issues

#### Symptom: "Not Secure" warning, SSL errors

**Solutions:**

**A. Certificate not installed**
```bash
# Install certificate
sudo certbot --nginx -d yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

**B. Mixed content warnings**
```bash
# Update all URLs to HTTPS in .env
REACT_APP_API_URL=https://yourdomain.com/api

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

**C. Certificate expired**
```bash
# Renew certificate
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

---

### 6. Worker/Background Jobs Not Running

#### Symptom: Emails not sending, reports not generating

**Check workers:**
```bash
# Check if workers are running
docker ps | grep worker

# Check worker logs
docker-compose logs worker
docker-compose logs demographic-worker
```

**Solutions:**
```bash
# Restart workers
docker-compose restart worker demographic-worker

# Check Redis connection
docker exec -it intelli-system-worker-1 redis-cli ping
```

---

### 7. Login Issues

#### Symptom: Can't login, "Invalid credentials"

**Diagnosis:**
```bash
# Check if user exists
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb -c "SELECT * FROM admin_users;"

# Check JWT secret
grep JWT_SECRET .env
```

**Solutions:**

**A. Create new admin user**
```bash
# Generate password hash
docker exec -it intelli-system-backend-1 node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('NewPassword123', 10).then(hash => console.log(hash));"

# Insert user
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb -c "
INSERT INTO admin_users (username, email, password, role) 
VALUES ('admin2', 'admin2@company.com', 'HASH_HERE', 'superadmin');"
```

**B. Reset password**
```bash
# Update existing user password
docker exec -it intelli-system-db-1 psql -U intelliuser -d intellidb -c "
UPDATE admin_users SET password='NEW_HASH' WHERE username='admin';"
```

---

### 8. File Upload Issues

#### Symptom: "File too large" or upload fails

**Solutions:**

**A. Increase Nginx limits**
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/intelli-system

# Add/increase:
client_max_body_size 100M;

# Reload
sudo systemctl reload nginx
```

**B. Check disk space**
```bash
df -h
# If full, clean up:
docker system prune -a
```

---

## Emergency Recovery Procedures

### Complete System Reset
```bash
# WARNING: This will delete all data!
docker-compose down -v
docker system prune -a --volumes
rm -rf node_modules
git reset --hard HEAD
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Restore from Backup
```bash
# Stop services
docker-compose down

# Restore database
gunzip < backup.sql.gz | docker exec -i intelli-system-db-1 psql -U intelliuser intellidb

# Restore files (if needed)
tar -xzf app_backup.tar.gz -C /opt/intelli-system

# Start services
docker-compose up -d
```

### Roll Back to Previous Version
```bash
# Check git history
git log --oneline -10

# Rollback to specific commit
git checkout [COMMIT_HASH]

# Rebuild and restart
docker-compose build
docker-compose up -d
```

---

## Diagnostic Scripts

### Create Health Check Script
```bash
cat > /opt/intelli-system/health-check.sh << 'EOF'
#!/bin/bash
echo "=== IntelliSystem Health Check ==="
echo ""

# Check services
echo "Service Status:"
docker-compose ps

echo ""
echo "Resource Usage:"
docker stats --no-stream

echo ""
echo "Connectivity Tests:"
curl -s http://localhost:3001/health && echo "✅ Backend OK" || echo "❌ Backend Failed"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend Failed"

echo ""
echo "Database Check:"
docker exec intelli-system-db-1 psql -U intelliuser -d intellidb -c "SELECT COUNT(*) FROM users;" 2>/dev/null && echo "✅ Database OK" || echo "❌ Database Failed"

echo ""
echo "Redis Check:"
docker exec intelli-system-redis-1 redis-cli ping > /dev/null 2>&1 && echo "✅ Redis OK" || echo "❌ Redis Failed"

echo ""
echo "Disk Space:"
df -h | grep -E '^/dev/'

echo ""
echo "Memory Usage:"
free -h
EOF

chmod +x /opt/intelli-system/health-check.sh
```

---

## Getting Help

### Before Asking for Help:
1. Run the health check script
2. Collect relevant logs
3. Note any recent changes
4. Check GitHub issues

### Information to Provide:
- Error messages (complete)
- Service logs (last 100 lines)
- Environment (dev/staging/production)
- Recent changes made
- Steps to reproduce

### Log Collection Command:
```bash
# Collect all logs for support
docker-compose logs --tail=200 > support-logs.txt 2>&1
tar -czf intelli-logs-$(date +%Y%m%d-%H%M%S).tar.gz support-logs.txt .env
```

---

## Prevention Tips

1. **Always backup before updates**
2. **Test in staging first**
3. **Monitor logs regularly**
4. **Keep documentation updated**
5. **Use version control for configurations**
6. **Set up monitoring alerts**
7. **Regular security updates**
8. **Document all customizations**

---

**Document Version**: 1.0
**Last Updated**: January 11, 2025