FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    ca-certificates

RUN pip3 install --no-cache-dir yt-dlp

# FIX PATH chuẩn render
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "api.js"]
