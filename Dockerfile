FROM node:18

# system tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    ca-certificates

# install yt-dlp chuẩn (QUAN TRỌNG)
RUN pip3 install --no-cache-dir yt-dlp

# đảm bảo binary luôn accessible
RUN ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp || true

# verify ngay trong build (QUAN TRỌNG)
RUN yt-dlp --version
RUN ffmpeg -version

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
