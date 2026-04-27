FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    ca-certificates

RUN pip3 install --no-cache-dir yt-dlp

RUN ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp || true

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
