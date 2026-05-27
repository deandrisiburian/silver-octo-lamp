FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create volume directory for auth data
RUN mkdir -p /app/auth_info

# Expose port
EXPOSE 3000

# Start the bot
CMD ["node", "bot/bot.js"]
