# Worker service (BullMQ replacement) — build from the `class-sync` directory so this
# image can reuse the shared `src/lib/*` code:
#
#   docker build -f worker/Dockerfile -t classsync-worker .
#   docker run -p 3001:3001 --env-file .env classsync-worker
#
# Deploy the same image to Cloud Run (scale-to-zero, request-based CPU):
#
#   gcloud run deploy classsync-worker --source . --dockerfile worker/Dockerfile \
#     --region asia-south1 --min-instances 0 --max-instances 10 --port 3001 \
#     --set-env-vars WORKER_ROLE=worker

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV WORKER_ROLE=worker
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY worker ./worker
RUN npx prisma generate

EXPOSE 3001
CMD ["npx", "tsx", "worker/src/node-server.ts"]
