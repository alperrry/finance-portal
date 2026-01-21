FROM node:20-alpine

WORKDIR /app

# bağımlılıkları önce kopyala (cache için iyi)
COPY package*.json ./
RUN npm ci || npm install

# kaynak kodu kopyala
COPY . .

EXPOSE 3000

# Vite dev server: container içinden erişim için host 0.0.0.0 şart
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","3000"]
