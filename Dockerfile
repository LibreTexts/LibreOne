FROM node:18-alpine
LABEL org.opencontainers.image.source="https://github.com/LibreTexts/LibreOne"

WORKDIR /usr/src/libreone

COPY . .

# Install dependencies
RUN npm ci

EXPOSE 5001

HEALTHCHECK --timeout=5s --start-period=45s \
  CMD wget -nv -t1 --spider http://localhost:5001/health || exit 1

ENTRYPOINT [ "npm", "run", "prod" ]