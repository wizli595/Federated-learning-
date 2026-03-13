FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    numpy>=1.24.0 \
    fastapi>=0.110.0 \
    "uvicorn[standard]>=0.29.0" \
    pyyaml>=6.0

COPY shared/ ./shared/
COPY server/app/ ./app/

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
