FROM image-registry.openshift-image-registry.svc:5000/openshift/node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM image-registry.openshift-image-registry.svc:5000/openshift/nginx:latest
COPY --from=builder /app/dist /opt/app-root/src
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
