FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY backend /app
# Copy shared tools module for imports like `tools.sql_tools`
COPY tools /tools
# Add project root to PYTHONPATH so imports like `tools.sql_tools` resolve
ENV PYTHONPATH="/app:/tools"
WORKDIR /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


