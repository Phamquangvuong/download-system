FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    ca-certificates

# install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# 🔥 FIX QUAN TRỌNG: add PATH đúng chỗ pip install
ENV PATH="/root/.local/bin:$PATH"

# verify (FAIL BUILD nếu chưa có)
RUN yt-dlp --version
RUN ffmpeg -version

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "api.js"]
