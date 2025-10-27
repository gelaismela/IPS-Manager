#!/bin/bash

# IPS Manager Network Setup Script
echo "🚀 IPS Manager Network Setup"
echo "=============================="

# Get server IP address
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    echo "❌ Could not detect server IP automatically"
    echo "Please find your IP manually using: ip addr show"
    read -p "Enter your server IP address: " SERVER_IP
fi

echo "📡 Detected/Using server IP: $SERVER_IP"

# Create environment file for local network
ENV_FILE=".env.local"
echo "REACT_APP_API_BASE_URL=http://$SERVER_IP:8080" > $ENV_FILE

echo "✅ Created $ENV_FILE with API URL: http://$SERVER_IP:8080"

# Show network access information
echo ""
echo "🌐 Network Access Information:"
echo "   React App: http://$SERVER_IP:3000"
echo "   Backend API: http://$SERVER_IP:8080"
echo ""
echo "📋 Next Steps:"
echo "   1. Make sure your backend server is running on port 8080"
echo "   2. Run 'npm start' to start the React development server"
echo "   3. Access the app from any device on your WiFi network"
echo ""
echo "🔧 Backend Configuration Required:"
echo "   - Set server.address=0.0.0.0 in application.properties"
echo "   - Open firewall ports 3000 and 8080"
echo "   - Configure CORS to allow $SERVER_IP:3000"
echo ""

# Check if ports are available
echo "🔍 Checking port availability..."
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q ":8080 "; then
        echo "✅ Port 8080 is in use (backend server running)"
    else
        echo "⚠️  Port 8080 is not in use (start your backend server)"
    fi
    
    if netstat -tuln | grep -q ":3000 "; then
        echo "✅ Port 3000 is in use (React server running)"
    else
        echo "ℹ️  Port 3000 is available for React server"
    fi
else
    echo "ℹ️  Install net-tools to check port status: sudo apt install net-tools"
fi

echo ""
echo "✨ Setup complete! Your app is ready for local network access."