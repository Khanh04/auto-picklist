# Auto-Picklist Deployment Guide

This guide covers deploying the Auto-Picklist application to Coolify and other container platforms.

## 🚀 Quick Deploy to Coolify

### Prerequisites
- Coolify instance running
- Git repository access
- PostgreSQL database (can be created in Coolify)

### Step 1: Prepare Your Repository
1. Ensure all files are committed to your git repository
2. Push to your remote repository (GitHub, GitLab, etc.)

### Step 2: Create Application in Coolify
1. Go to your Coolify dashboard
2. Click "New Resource" → "Application"
3. Select "Public Repository" and enter your repository URL
4. Choose the branch (usually `main` or `master`)

### Step 3: Configure Environment Variables
In Coolify, set these environment variables:

```bash
# Database Configuration
DB_HOST=your_postgres_service_name  # e.g., autopicklist-db
DB_PORT=5432
DB_NAME=autopicklist
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Application
NODE_ENV=production
PORT=3000
```

### Step 4: Configure Database
1. In Coolify, create a new PostgreSQL database resource
2. Note the connection details
3. Update your application's environment variables with the database details

### Step 5: Deploy
1. In your application settings, set the build command: `npm run build`
2. Set the start command: `npm start`
3. Set the port to `3000`
4. Click "Deploy"

### Step 6: Initialize Database
After first deployment, access your application container and run:
```bash
npm run setup-db
```

## 🐳 Docker Deployment

### Local Testing
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Build and run with Docker Compose
npm run docker:run

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Production Docker
```bash
# Build production image
docker build -t auto-picklist .

# Run with external database
docker run -d \
  --name auto-picklist \
  -p 3000:3000 \
  -e DB_HOST=your_db_host \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=autopicklist \
  -v uploads:/app/uploads \
  auto-picklist
```

## 📋 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL host | localhost | ✅ |
| `DB_PORT` | PostgreSQL port | 5432 | ❌ |
| `DB_NAME` | Database name | autopicklist | ❌ |
| `DB_USER` | Database user | postgres | ✅ |
| `DB_PASSWORD` | Database password | - | ✅ |
| `NODE_ENV` | Environment | development | ❌ |
| `PORT` | Application port | 3000 | ❌ |
| `MAX_FILE_SIZE` | Max upload size | 5242880 | ❌ |
| `UPLOADS_DIR` | Upload directory | uploads | ❌ |

## 🗄️ Database Setup

### Automatic Setup
The application will automatically create the required database schema on first run if it doesn't exist.

### Manual Setup
If you need to manually initialize the database:
```bash
npm run setup-db
```

### Import Sample Data
If you have Excel supplier data to import:
```bash
npm run import-data
```

## 🔧 Troubleshooting

### Database Connection Issues
1. Verify environment variables are set correctly
2. Check database service is running
3. Ensure network connectivity between app and database
4. Check database logs for connection errors

### Build Issues
1. Ensure Node.js 18+ is available
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Container Issues
1. Check container logs: `docker logs container_name`
2. Verify environment variables are passed correctly
3. Ensure database is accessible from container

### Health Check
The application provides a health endpoint at `/health` that:
- Returns 200 OK if application and database are healthy
- Returns 503 Service Unavailable if there are issues
- Used by Docker and Coolify for health monitoring

## 📊 Monitoring

### Application Logs
- Application logs are output to stdout/stderr
- View logs in Coolify dashboard or with `docker logs`

### Database Monitoring
- Monitor PostgreSQL performance
- Watch for connection pool exhaustion
- Monitor disk space for uploads directory

### Performance Tips
1. **Database**: Use connection pooling (already configured)
2. **Uploads**: Mount uploads directory as persistent volume
3. **Memory**: Container typically needs 512MB-1GB RAM
4. **CPU**: Single CPU core sufficient for most workloads

## 🔐 Security Considerations

### Production Checklist
- [ ] Use strong database passwords
- [ ] Enable HTTPS (handled by Coolify)
- [ ] Limit file upload sizes
- [ ] Regular database backups
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated

### Database Security
- Use dedicated database user with minimal permissions
- Enable SSL connections if supported
- Regular security updates

## 🔄 Updates and Maintenance

### Updating the Application
1. Push changes to your git repository
2. In Coolify, click "Deploy" to update
3. Or use manual deployment commands

### Database Migrations
The application handles schema updates automatically. For manual migrations:
```bash
npm run setup-db
```

### Backup Strategy
1. **Database**: Regular PostgreSQL backups
2. **Uploads**: Backup uploads directory
3. **Configuration**: Backup environment variables

## 📞 Support

### Common Commands
```bash
# Start application
npm start

# Setup database
npm run setup-db

# Import data
npm run import-data

# Run tests
npm test

# Build frontend
npm run build
```

### Logs and Debugging
- Application logs to stdout
- Database connection issues logged as errors
- Health check endpoint: `GET /health`
- File uploads logged with timestamps

For additional support, check the application logs and verify all environment variables are correctly configured.