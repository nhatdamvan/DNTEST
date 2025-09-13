FROM node:20

WORKDIR /app

# Copy only server files
COPY server/package*.json ./
RUN npm install

# Skip the apt-get update that's causing issues
# RUN apt-get update && apt-get install -y ca-certificates
COPY server ./


EXPOSE 3001
CMD ["npm", "run", "dev"]