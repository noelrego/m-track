# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["sh", "-c", "while true; do sleep 3600; done"]

FROM base AS build
ARG VITE_API_URL=http://localhost:3000
ARG VITE_API_PREFIX=api
ARG VITE_AUTH_TRANSPORT=cookie
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_PREFIX=$VITE_API_PREFIX
ENV VITE_AUTH_TRANSPORT=$VITE_AUTH_TRANSPORT
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
