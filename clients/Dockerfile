FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    numpy>=1.24.0 \
    pandas>=2.0.0 \
    scikit-learn>=1.3.0 \
    requests>=2.31.0 \
    pyyaml>=6.0

# shared/model.py is injected at runtime via volume mount:
#   ../core/shared/model.py → /app/shared/model.py

COPY app/ ./app/
COPY client.py .
COPY config/client_config.yaml ./config/client_config.yaml

CMD ["python", "client.py"]
