FROM docker:27-cli

RUN apk add --no-cache \
      apache2-utils bash ca-certificates curl jq openssl \
      python3 py3-pip postgresql16-client tar tzdata \
    && apk add --no-cache docker-cli-compose \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir \
       Flask==3.1.1 gunicorn==23.0.0 requests==2.32.4

WORKDIR /app
COPY docker/ops/app.py /app/app.py
COPY docker/ops/templates /app/templates
COPY scripts /opt/veiron-scripts
RUN chmod 0755 /opt/veiron-scripts/*.sh

ENV PATH="/opt/venv/bin:${PATH}"
EXPOSE 8080
ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "--timeout", "900", "app:app"]
