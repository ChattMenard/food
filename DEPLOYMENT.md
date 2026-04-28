# Pantry AI - Deployment Guide

## Overview

This guide covers deploying Pantry AI to production environments including staging, production, and various hosting platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Development Environment
- Node.js 18+ 
- npm or yarn
- Git
- Modern web browser

### Production Requirements
- Web server (Nginx, Apache, or static hosting)
- SSL certificate (HTTPS required for PWA)
- Domain name
- (Optional) CDN for static assets
- (Optional) Backend API server

## Environment Configuration

### Environment Variables

Create environment-specific configuration files:

#### Development (`.env.local`)
```bash
# Development configuration
NODE_ENV="development"
VITE_AI_PROXY_URL="http://localhost:3001/aiProxy"
API_BASE_URL="http://localhost:3001/api"
CDN_BASE_URL="http://localhost:8080"
ANALYTICS_ID=""
SENTRY_DSN=""
```

#### Staging (`.env.staging`)
```bash
# Staging configuration
NODE_ENV="staging"
VITE_AI_PROXY_URL="https://staging-api.pantry-ai.com/aiProxy"
API_BASE_URL="https://staging-api.pantry-ai.com/api"
CDN_BASE_URL="https://staging-cdn.pantry-ai.com"
ANALYTICS_ID="GA-STAGING-ID"
SENTRY_DSN="https://staging-sentry-dsn"
ENABLE_DEBUG_MODE="true"
```

#### Production (`.env.production`)
```bash
# Production configuration
NODE_ENV="production"
VITE_AI_PROXY_URL="https://api.pantry-ai.com/aiProxy"
API_BASE_URL="https://api.pantry-ai.com/api"
CDN_BASE_URL="https://cdn.pantry-ai.com"
ANALYTICS_ID="GA-PRODUCTION-ID"
SENTRY_DSN="https://production-sentry-dsn"
ENABLE_DEBUG_MODE="false"
```

### Security Headers

The application includes Content Security Policy (CSP) headers that are automatically configured based on the environment. Ensure your hosting provider allows custom headers.

## Build Process

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build:prod
```

The production build includes:
- Minified JavaScript and CSS
- Console.log removal
- Optimized bundle sizes
- Source maps (disabled in production)
- Build metadata generation

### Build Analysis
```bash
npm run build:analyze
```

## Deployment Options

### 1. Static Hosting (Recommended)

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build:prod
netlify deploy --prod --dir=www/dist
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
```bash
# Build for GitHub Pages
npm run build:prod

# Deploy to gh-pages branch
npx gh-pages -d www/dist
```

### 2. Traditional Web Server

#### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name pantry-ai.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /var/www/pantry-ai/www/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Service Worker
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML files - no caching
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName pantry-ai.com
    DocumentRoot /var/www/pantry-ai/www/dist
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
    
    # Service Worker
    <Files "service-worker.js">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </Files>
    
    # Static assets
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header set Cache-Control "public, immutable"
    </LocationMatch>
    
    # HTML files
    <LocationMatch "\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </LocationMatch>
    
    # SPA fallback
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

### 3. Cloud Platform Deployment

#### AWS S3 + CloudFront
```bash
# Deploy to S3
aws s3 sync www/dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

#### Google Cloud Storage
```bash
# Deploy to GCS
gsutil -m rsync -r -d www/dist/ gs://your-bucket-name/

# Set proper permissions
gsutil -m acl ch -r -u AllUsers:R gs://your-bucket-name/**
```

## Staging Deployment

### Automated Staging
Use the provided staging deployment script:

```bash
# Deploy to staging
npm run deploy:staging
```

This script:
- Builds the application for production
- Deploys to staging environment
- Runs health checks
- Provides deployment summary

### Manual Staging
```bash
# Build for staging
cp .env.staging .env.local
npm run build:prod

# Deploy to staging server
rsync -avz www/dist/ user@staging-server:/var/www/staging/
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Security headers tested
- [ ] Performance testing completed
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking enabled

### Production Deployment Steps

1. **Final Build**
   ```bash
   cp .env.production .env.local
   npm run build:prod
   ```

2. **Deploy Files**
   ```bash
   # Using rsync for traditional servers
   rsync -avz --delete www/dist/ user@server:/var/www/pantry-ai/
   
   # Or use your preferred deployment method
   ```

3. **Verify Deployment**
   ```bash
   curl -I https://pantry-ai.com/
   ```

4. **Test Critical Features**
   - Application loads correctly
   - PWA features work
   - Offline functionality
   - Analytics tracking
   - Error reporting

### Post-Deployment

1. **Monitor Performance**
   ```bash
   # Check application logs
   tail -f /var/log/nginx/access.log
   
   # Monitor error rates
   # Check analytics dashboard
   ```

2. **Update DNS** (if needed)
3. **Notify team** of deployment
4. **Monitor user feedback**

## Monitoring & Maintenance

### Application Monitoring

The application includes built-in monitoring:

- **Error Tracking**: Automatic error reporting to Sentry
- **Performance Monitoring**: Page load times and user interactions
- **Analytics**: User behavior and feature usage
- **Health Checks**: Application status monitoring

### Log Management

Monitor these key areas:
- Error rates and types
- Performance metrics
- User engagement
- Resource usage

### Backup Strategy

Use the provided backup script:

```bash
# Create backup
npm run backup:create

# List backups
npm run backup:list

# Restore from backup
npm run backup:restore backup_name
```

### Updates and Maintenance

1. **Regular Updates**
   - Update dependencies monthly
   - Review security advisories
   - Update SSL certificates

2. **Performance Optimization**
   - Monitor bundle sizes
   - Optimize images and assets
   - Review caching strategy

3. **Security Maintenance**
   - Review CSP policies
   - Update security headers
   - Monitor for vulnerabilities

## Troubleshooting

### Common Issues

#### Application Won't Load
1. Check environment variables
2. Verify build completed successfully
3. Check browser console for errors
4. Verify server configuration

#### PWA Features Not Working
1. Ensure HTTPS is enabled
2. Check service worker registration
3. Verify manifest.json is accessible
4. Test with different browsers

#### Performance Issues
1. Check bundle sizes
2. Verify caching headers
3. Monitor network requests
4. Use performance profiling tools

#### Error Tracking Not Working
1. Verify Sentry DSN is correct
2. Check CSP allows external requests
3. Review error reporting configuration

### Debug Mode

Enable debug mode for troubleshooting:
```bash
# Set debug environment variable
export DEBUG_MODE=true

# Or update environment file
echo "ENABLE_DEBUG_MODE=true" >> .env.local
```

### Getting Help

1. **Check Logs**: Review browser console and server logs
2. **Review Documentation**: Check this guide and code comments
3. **Community**: Check GitHub issues and discussions
4. **Support**: Contact development team

## Security Considerations

### Production Security
- Always use HTTPS
- Implement proper CSP headers
- Keep dependencies updated
- Monitor for security advisories
- Regular security audits

### Data Protection
- User data stored locally (IndexedDB)
- Analytics data anonymized
- No sensitive data in client-side code
- Secure API communication

### Access Control
- Rate limiting on APIs
- Input validation and sanitization
- XSS protection via CSP
- CSRF protection for state changes

## Performance Optimization

### Bundle Optimization
- Code splitting for large features
- Tree shaking for unused code
- Image optimization and lazy loading
- Font optimization

### Caching Strategy
- Static assets: 1 year cache
- HTML files: no cache
- Service worker: offline caching
- CDN caching for global distribution

### Monitoring Performance
- Core Web Vitals tracking
- User experience metrics
- Error rates and types
- Resource loading times

## Conclusion

This deployment guide covers all aspects of deploying Pantry AI to production. Follow the pre-deployment checklist and monitoring recommendations to ensure a successful deployment.

For additional support or questions, refer to the project documentation or contact the development team.
