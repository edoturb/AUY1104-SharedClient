FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY index.js ./
EXPOSE 3000
CMD ["node", "index.js"]
RUN INSTRUCCION_INVALIDA_EA3_I4
