# Validation & Fix Loop Docker Container
# Provides a complete environment for running validation in any CI/CD system

FROM node:18-slim

# Install system dependencies for Playwright and validation tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    wget \
    git \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && \
    npm install --no-save \
        @playwright/test \
        playwright \
        jest \
        benchmark

# Install Playwright browsers
RUN npx playwright install --with-deps

# Copy application code
COPY . .

# Create validation reports directory
RUN mkdir -p validation-reports

# Create validation user (security best practice)
RUN addgroup --system --gid 1001 validation && \
    adduser --system --uid 1001 --ingroup validation validation

# Change ownership of app directory
RUN chown -R validation:validation /app

# Switch to validation user
USER validation

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Validation container is healthy')" || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV CI=true
ENV VALIDATION_CONTAINER=true

# Expose port for test server (if needed)
EXPOSE 8080

# Default command runs full validation
CMD ["npm", "run", "ci:validate"]

# Alternative entry points:
# docker run validation:latest npm run validate:quick
# docker run validation:latest npm run validate:fix
# docker run validation:latest npm run ci:performance
# docker run validation:latest node validation/cli.js --help