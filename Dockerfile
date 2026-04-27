FROM node:18

# Cài ffmpeg trong container (KHÔNG dùng apt trên Render nữa)
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
