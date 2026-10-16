#!/usr/bin/env bash
# ==============================================================================
# Oculus CLI Installer (macOS & Linux)
# https://github.com/oculus-security/oculus
# ==============================================================================
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==>${NC} Installing Oculus CLI..."

# 1. Check Node.js >= 18.0.0
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Error:${NC} Node.js is not installed. Please install Node.js >= 18.0.0 (https://nodejs.org)."
    exit 1
fi

NODE_VERSION=$(node -v | tr -d 'v')
MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo -e "${RED}Error:${NC} Node.js version $NODE_VERSION detected. Oculus CLI requires Node.js >= 18.0.0."
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js v$NODE_VERSION detected (>= 18.0.0 requirement met)"

# 2. Check npm
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Error:${NC} npm is not installed."
    exit 1
fi

# 3. Check if local tarball exists in current directory or install from npm
if [ -f "./oculus-cli-1.0.0.tgz" ]; then
    echo -e "${BLUE}==>${NC} Found local distribution tarball oculus-cli-1.0.0.tgz. Installing globally..."
    npm install -g ./oculus-cli-1.0.0.tgz
elif [ -f "./downloads/oculus-cli-1.0.0.tgz" ]; then
    echo -e "${BLUE}==>${NC} Found local distribution tarball ./downloads/oculus-cli-1.0.0.tgz. Installing globally..."
    npm install -g ./downloads/oculus-cli-1.0.0.tgz
else
    echo -e "${BLUE}==>${NC} Installing @oculus/cli globally via npm..."
    npm install -g @oculus/cli || {
        echo -e "${YELLOW}Notice:${NC} If npm permissions failed, try running with sudo or configure a user-level prefix:"
        echo "  sudo npm install -g @oculus/cli"
        exit 1
    }
fi

# 4. Verify installation
if command -v oculus >/dev/null 2>&1; then
    CLI_VER=$(oculus --version 2>/dev/null || echo "1.0.0")
    echo ""
    echo -e "${GREEN}✓ Oculus CLI v$CLI_VER installed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Authenticate with your developer token:"
    echo "     oculus auth login --token <your-developer-token>"
    echo ""
    echo "  2. Configure your active workspace:"
    echo "     oculus config set workspace <workspace-id>"
    echo ""
    echo "  3. Trigger your first scan:"
    echo "     oculus scan --repository <repo-id> --branch main --wait"
    echo ""
else
    echo -e "${YELLOW}Warning:${NC} 'oculus' binary was installed but is not on your PATH."
    echo "Ensure your global npm bin directory is in your PATH environment variable."
fi
