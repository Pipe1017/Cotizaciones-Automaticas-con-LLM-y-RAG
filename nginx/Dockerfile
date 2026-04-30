# Stage 1: build React app
FROM node:20-alpine AS builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --omit=dev
COPY frontend/ .
RUN npm run build

# Stage 2: nginx sirve el frontend compilado + actúa como reverse proxy
FROM nginx:1.27-alpine
COPY --from=builder /frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
