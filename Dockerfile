FROM public.ecr.aws/amazonlinux/amazonlinux:2023

ENV DENO_VERSION=1.41.0
ENV PATH="/deno:$PATH"
ENV DENO_DIR="/app/.cache/deno"

RUN dnf update -y && \
    dnf install -y --allowerasing curl unzip git && \
    dnf clean all && \
    rm -rf /var/cache/dnf

RUN curl -fsSL https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-aarch64-unknown-linux-gnu.zip -o deno.zip && \
    mkdir -p /deno && \
    unzip deno.zip -d /deno && \
    chmod 755 /deno/deno && \
    rm deno.zip

WORKDIR /app

COPY . .

RUN mkdir -p /app/.cache/deno

RUN groupadd -r -g 1000 appgroup && \
    useradd -r -u 1000 -g appgroup -s /bin/bash -c "App User" appuser && \
    chown -R appuser:appgroup /app && \
    chmod -R 755 /app && \
    chmod +x /app/mcp.ts

RUN chown -R appuser:appgroup /deno

USER appuser

ENTRYPOINT ["deno", "run", "--allow-read", "--allow-write", "--allow-net", "--allow-env", "--allow-run", "--allow-sys", "/app/mcp.ts"]
