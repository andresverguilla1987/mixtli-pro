FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY src ./src
EXPOSE 7000
CMD ["node","src/server.js"]
