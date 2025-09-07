FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 7003
CMD ["node","server.js"]
