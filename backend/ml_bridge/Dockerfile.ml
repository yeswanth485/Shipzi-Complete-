FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY *.pkl ./
COPY ml_bridge.py .
ENV PORT=5001
EXPOSE $PORT
CMD gunicorn ml_bridge:app --workers 2 --bind 0.0.0.0:$PORT --timeout 120
