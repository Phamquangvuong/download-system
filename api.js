const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// QUEUE SYSTEM
// ======================
let queue = []
let running = false

function processQueue() {
 if (running) return
 if (!queue.length) return

 const job = queue.shift()
 running = true

 Promise.resolve(job())
  .catch(err => console.log("QUEUE ERROR:", err))
  .finally(() => {
   running = false
   processQueue()
  })
}

// ======================
// CLEAN URL (FIX ENCODE ISSUE)
// ======================
function getUrl(req) {
 return decodeURIComponent(req.query.url || "")
}

// ======================
// DOWNLOAD (yt-dlp)
// ======================
function download(url, file) {
 return new Promise((resolve, reject) => {
  const yt = spawn("yt-dlp", [
   "-f", "bv*+ba/b",
   "--merge-output-format", "mp4",
   "--no-playlist",
   "--geo-bypass",
   "--retries", "10",
   "-o", file,
   url
  ], { stdio: "inherit" })

  yt.on("close", code => {
   if (code === 0) resolve()
   else reject("yt-dlp failed")
  })
 })
}

// ======================
// UPLOAD CATBOX
// ======================
async function uploadCatbox(file) {
 const form = new FormData()
 form.append("reqtype", "fileupload")
 form.append("fileToUpload", fs.createReadStream(file))

 const res = await axios.post(
  "https://catbox.moe/user/api.php",
  form,
  { headers: form.getHeaders() }
 )

 return res.data
}

// ======================
// SUPPORT CHECK
// ======================
function checkSupport(url) {
 return [
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "twitter.com",
  "x.com",
  "vimeo.com",
  "youtube.com",
  "youtu.be"
 ].some(d => url.includes(d))
}

// ======================
// ROOT API
// ======================
app.get(BASE, (req, res) => {
 res.json({
  name: "FULL VIDEO API SYSTEM",
  base: BASE,
  endpoints: {
   download: BASE + "/download?url=",
   support: BASE + "/support",
   queue: BASE + "/queue",
   health: BASE + "/health"
  },
  status: "online"
 })
})

// ======================
// DOWNLOAD ROUTE
// ======================
app.get(BASE + "/download", (req, res) => {
 const url = getUrl(req)

 if (!url) {
  return res.json({ status: "error", message: "no url" })
 }

 if (!checkSupport(url)) {
  return res.json({ status: "error", message: "unsupported platform" })
 }

 const file = "video_" + Date.now() + ".mp4"

 const job = async () => {
  try {
   console.log("📥 Download:", url)

   await download(url, file)

   console.log("☁️ Uploading...")

   const catbox = await uploadCatbox(file)

   fs.unlinkSync(file)

   res.json({
    status: "success",
    url: catbox
   })

  } catch (err) {
   console.log("❌ ERROR:", err)

   res.json({
    status: "error",
    message: String(err)
   })
  }
 }

 queue.push(job)
 processQueue()
})

// ======================
// SUPPORT API
// ======================
app.get(BASE + "/support", (req, res) => {
 res.json({
  supported: [
   "tiktok",
   "instagram",
   "facebook",
   "twitter",
   "x",
   "vimeo",
   "youtube"
  ],
  features: {
   download: true,
   queue: true,
   ffmpeg: true,
   yt_dlp: true,
   catbox: true
  }
 })
})

// ======================
// QUEUE STATUS
// ======================
app.get(BASE + "/queue", (req, res) => {
 res.json({
  waiting: queue.length,
  running
 })
})

// ======================
// HEALTH CHECK
// ======================
app.get(BASE + "/health", (req, res) => {
 res.json({
  status: "online",
  uptime: process.uptime()
 })
})

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━━━━━")
 console.log("🚀 FULL API RUNNING")
 console.log("📥 /home/api/download?url=")
 console.log("📚 /home/api/support")
 console.log("📦 /home/api/queue")
 console.log("❤️ /home/api/health")
 console.log("━━━━━━━━━━━━━━━━━━━━")
})
