FROM python:3.12.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./

RUN pip install -r requirements.txt \
    && useradd --create-home --no-log-init appuser

COPY --chown=appuser:appuser main.py ./

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]