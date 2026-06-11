FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY *.pkl ./
COPY ml_bridge.py .
EXPOSE 5001
CMD ["gunicorn", "ml_bridge:app", "--workers", "2", "--bind", "0.0.0.0:5001"]
