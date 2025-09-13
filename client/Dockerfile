FROM node:20

WORKDIR /app

# Copy only the frontend package.json and package-lock.json
COPY client/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code
COPY client/ ./

EXPOSE 3000

CMD ["npm", "start"]