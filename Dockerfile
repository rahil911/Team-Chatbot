# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (FIX: Added curl for health checks)
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all Python files
COPY *.py .

# Copy data and personas directories
COPY data/ ./data/
COPY personas/ ./personas/

# Create logs directory
RUN mkdir -p logs

# Expose port 8000
EXPOSE 8000

# FIX: Add health check for Azure Container Apps monitoring
# Checks /health endpoint every 30s, starts after 5s, times out after 10s, 3 retries
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the server with uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
