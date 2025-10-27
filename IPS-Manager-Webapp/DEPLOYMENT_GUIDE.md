# Deployment Guide for Linux Server

## Step 1: Find Your Linux Server's IP Address

On your Linux server, run one of these commands to find the IP address:

```bash
# Option 1: Get all network interfaces
ip addr show

# Option 2: Get just the IP address
hostname -I

# Option 3: Get specific interface (e.g., eth0, wlan0)
ip addr show eth0
```

Look for an IP address that starts with:

- `192.168.x.x` (most common for home WiFi)
- `10.x.x.x` (corporate networks)
- `172.16.x.x` to `172.31.x.x` (private networks)

## Step 2: Update Environment Configuration

1. **For local network deployment**, edit `.env.local`:

   ```
   REACT_APP_API_BASE_URL=http://YOUR_SERVER_IP:8080
   ```

   Replace `YOUR_SERVER_IP` with the actual IP you found in Step 1.

   Example:

   ```
   REACT_APP_API_BASE_URL=http://192.168.1.150:8080
   ```

2. **For production deployment**, edit `.env.production`:
   ```
   REACT_APP_API_BASE_URL=http://YOUR_SERVER_IP:8080
   ```

## Step 3: Backend Server Configuration

Make sure your backend Java server is configured to accept connections from other devices:

1. **Update application.properties** (Spring Boot):

   ```properties
   server.address=0.0.0.0
   server.port=8080
   ```

2. **Or update application.yml**:
   ```yaml
   server:
     address: 0.0.0.0
     port: 8080
   ```

## Step 4: Firewall Configuration

On your Linux server, open the necessary ports:

```bash
# Ubuntu/Debian
sudo ufw allow 8080
sudo ufw allow 3000

# CentOS/RHEL/Fedora
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 5: Build and Deploy React App

### Option A: Development Server (for testing)

```bash
npm start
```

The app will be available at `http://YOUR_SERVER_IP:3000`

### Option B: Production Build

```bash
# Build for production
npm run build

# Serve using a static server
npx serve -s build -l 3000

# Or use nginx/apache to serve the built files
```

## Step 6: Network Access

### From Other Devices on the Same WiFi:

- **React App**: `http://YOUR_SERVER_IP:3000`
- **Backend API**: `http://YOUR_SERVER_IP:8080`

### Testing Connection:

```bash
# Test if the server is reachable
ping YOUR_SERVER_IP

# Test if the port is open
telnet YOUR_SERVER_IP 8080
```

## Step 7: Alternative Configuration Methods

### Method 1: Runtime Configuration

If you want to avoid rebuilding the app, you can also use a config file:

1. Create `public/config.js`:

   ```javascript
   window.APP_CONFIG = {
     API_BASE_URL: "http://192.168.1.150:8080",
   };
   ```

2. Update `public/index.html` to include:

   ```html
   <script src="/config.js"></script>
   ```

3. Update `api.js`:
   ```javascript
   export const API_BASE =
     window.APP_CONFIG?.API_BASE_URL ||
     process.env.REACT_APP_API_BASE_URL ||
     "http://localhost:8080";
   ```

### Method 2: Docker Deployment (Advanced)

```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
```

```bash
# Build and run with Docker
docker build -t ips-manager-webapp .
docker run -p 3000:3000 -e REACT_APP_API_BASE_URL=http://192.168.1.150:8080 ips-manager-webapp
```

## Common Issues and Solutions

### 1. Connection Refused

- Check if the backend server is running
- Verify firewall settings
- Ensure server is binding to 0.0.0.0, not 127.0.0.1

### 2. CORS Issues

Update your Spring Boot backend to allow cross-origin requests:

```java
@CrossOrigin(origins = {"http://192.168.1.150:3000", "http://localhost:3000"})
@RestController
public class YourController {
    // ... your endpoints
}
```

Or configure globally:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://192.168.1.150:3000", "http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

### 3. Environment Variables Not Working

- Restart the development server after changing .env files
- Make sure environment variable names start with `REACT_APP_`
- Check that .env files are in the root directory

## Quick Setup Script

Create this script to automate the setup:

```bash
#!/bin/bash
# setup.sh

echo "Setting up IPS Manager for local network deployment..."

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Detected server IP: $SERVER_IP"

# Update environment file
echo "REACT_APP_API_BASE_URL=http://$SERVER_IP:8080" > .env.local

echo "Environment configured!"
echo "React app will be available at: http://$SERVER_IP:3000"
echo "Make sure your backend is running on: http://$SERVER_IP:8080"

# Make executable: chmod +x setup.sh
# Run with: ./setup.sh
```

Remember to replace `YOUR_SERVER_IP` with your actual server's IP address in all configuration files!
