# Validation Docker Container

This directory contains Docker configurations for running the validation and fix loop in containerized environments.

## Quick Start

### Build and Run

```bash
# Build the validation container
docker build -f validation/cicd/docker/Dockerfile -t idle-cultivation-validation:latest .

# Run full validation
docker run --rm -v $(pwd)/validation-reports:/app/validation-reports idle-cultivation-validation:latest

# Run quick validation
docker run --rm idle-cultivation-validation:latest npm run validate:quick

# Run with custom settings
docker run --rm \
  -e MAX_FIX_ITERATIONS=10 \
  -e FIX_CONFIDENCE_THRESHOLD=90 \
  -v $(pwd)/validation-reports:/app/validation-reports \
  idle-cultivation-validation:latest
```

### Using Docker Compose

```bash
# Run full validation suite
docker-compose -f validation/cicd/docker/docker-compose.yml up validation

# Run quick validation only
docker-compose -f validation/cicd/docker/docker-compose.yml --profile quick up quick-check

# Run performance tests
docker-compose -f validation/cicd/docker/docker-compose.yml --profile performance up performance

# Run everything
docker-compose -f validation/cicd/docker/docker-compose.yml --profile quick --profile performance up
```

## Container Features

- **Pre-installed Dependencies**: Node.js, Playwright browsers, system dependencies
- **Security**: Runs as non-root user
- **Health Checks**: Built-in container health monitoring
- **Volume Mounts**: Easy access to validation reports
- **Multi-stage**: Optimized for CI/CD environments

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `CI` | `true` | CI mode flag |
| `VALIDATION_TIMEOUT` | `1800000` | Validation timeout (30 min) |
| `MAX_FIX_ITERATIONS` | `5` | Maximum fix iterations |
| `FIX_CONFIDENCE_THRESHOLD` | `80` | Fix confidence threshold |

## Available Commands

```bash
# Full validation loop
docker run validation:latest npm run ci:validate

# Quick syntax/basic checks
docker run validation:latest npm run validate:quick

# Auto-fix mode
docker run validation:latest npm run validate:fix

# Performance tests
docker run validation:latest npm run ci:performance

# Custom CLI usage
docker run validation:latest node validation/cli.js --help
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run validation in container
  run: |
    docker build -f validation/cicd/docker/Dockerfile -t validation:latest .
    docker run --rm -v $PWD/validation-reports:/app/validation-reports validation:latest
```

### GitLab CI

```yaml
validate:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -f validation/cicd/docker/Dockerfile -t validation:latest .
    - docker run --rm -v $PWD/validation-reports:/app/validation-reports validation:latest
  artifacts:
    paths:
      - validation-reports/
```

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Validate') {
      steps {
        script {
          docker.build('validation:latest', '-f validation/cicd/docker/Dockerfile .')
          docker.image('validation:latest').run('-v $PWD/validation-reports:/app/validation-reports')
        }
      }
    }
  }
}
```

## Local Development

### Setup

```bash
# Clone repository
git clone <repository-url>
cd idle-cultivation-game

# Build container
docker build -f validation/cicd/docker/Dockerfile -t validation:dev .

# Run interactive shell
docker run -it --rm validation:dev /bin/bash
```

### Testing Container

```bash
# Test container build
docker build --no-cache -f validation/cicd/docker/Dockerfile -t validation:test .

# Test health check
docker run --rm validation:test node -e "console.log('Health check passed')"

# Test validation command
docker run --rm validation:test npm run validate:quick
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Fails**
   ```bash
   # Ensure system dependencies are installed
   docker run --rm validation:latest npx playwright install --with-deps
   ```

2. **Permission Errors**
   ```bash
   # Check user permissions
   docker run --rm validation:latest id
   # Should show: uid=1001(validation) gid=1001(validation)
   ```

3. **Out of Memory**
   ```bash
   # Increase container memory
   docker run --rm --memory=2g validation:latest
   ```

4. **Network Issues**
   ```bash
   # Test network connectivity
   docker run --rm validation:latest curl -I https://google.com
   ```

### Debug Mode

```bash
# Run with debug output
docker run --rm -e DEBUG=1 validation:latest npm run validate:quick

# Interactive debugging
docker run -it --rm validation:latest /bin/bash
```

## Production Deployment

### Registry Push

```bash
# Tag for registry
docker tag validation:latest your-registry.com/idle-cultivation-validation:v1.0.0

# Push to registry
docker push your-registry.com/idle-cultivation-validation:v1.0.0
```

### Kubernetes Deployment

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validation-job
spec:
  template:
    spec:
      containers:
      - name: validation
        image: your-registry.com/idle-cultivation-validation:v1.0.0
        env:
        - name: CI
          value: "true"
        - name: MAX_FIX_ITERATIONS
          value: "10"
      restartPolicy: Never
```

## Security

- Container runs as non-root user (uid=1001)
- Minimal attack surface with slim base image
- No secrets stored in container
- Health checks for monitoring
- Regular security updates via base image updates

## Performance

- Multi-stage build for smaller image size
- Cached dependency layers
- Parallel browser installation
- Optimized for CI/CD speed