FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY worker/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --timeout 300 torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --timeout 300 -r /tmp/requirements.txt

WORKDIR /app

COPY worker/ ./worker/
COPY fl/shared/ ./fl/shared/

CMD ["python", "-m", "worker.main"]
