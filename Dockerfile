FROM node:latest

WORKDIR /usr/app

COPY . .
RUN npm install
RUN npm audit fix

EXPOSE 8080
CMD [ "node", "index.js" ]
