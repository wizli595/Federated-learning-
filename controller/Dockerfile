FROM python:3.11-slim

# Install dependencies first (layer cache)
COPY controller/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Mirror the local repo layout so all Path(__file__).parent×4 = /app
WORKDIR /app

COPY controller/app/ ./controller/app/

# fl/shared is needed at inference time; fl/server + fl/client for spawning training
COPY fl/shared/  ./fl/shared/
COPY fl/server/  ./fl/server/
COPY fl/client/  ./fl/client/

# Scripts for data generation
COPY scripts/ ./scripts/

# Create runtime directories (volumes will mount here)
RUN mkdir -p fl/data fl/output controller/app/clients

EXPOSE 8080

# Run from /app/controller so "app.main:app" resolves correctly
WORKDIR /app/controller
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
