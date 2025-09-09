FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --production || npm i
COPY . .
EXPOSE 10000
CMD ["node","server.js"]
