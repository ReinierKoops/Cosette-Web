# Docker fork changes
FROM dli123/cosette-web

COPY resources/index.html frontend/

COPY resources/main.py backend/
