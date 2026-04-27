const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn } = require("child_process")
const { execSync } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// FIND YT-DLP AUTO PATH (FIX ENOENT)
// ======================
function getYtDlpPath() {
 try {
  const path = execSync("which yt-dlp").toString().trim()
  if (path) return path
 } catch (e) {}

 return "yt-dlp" // fallback
}

const YTDLP = getYtDlpPath()

// ======================
// QUEUE SYSTEM SAFE
// ======================
let queue = []
let running = false

function processQueue() {
 if (running) return
 if (!queue.length) return

 const job = queue.shift()
 running = true

 Promise.resolve(job())
  .catch(console.error)
  .finally(() => {
   running = false
   processQueue()
  })
}

// ======================
// DOWNLOAD MP4 (FIXED)
// ======================
function downloadVideo(url, file) {
 return new Promise((resolve, reject) => {
  const yt = spawn(YTDLP, [
   "-f", "bv*+ba/b",
   "--merge-output-format", "mp4",
   "--no-playlist",
   "--geo-bypass",
   "--retries", "10",
   "-o", file,
   url
  ])

  yt.stdout.on("data", d => process.stdout.write(d))
  yt.stderr.on("data", d => process.stdout.write(d))

  yt.on("close", code => {
   if (code === 0) resolve()
   else reject("yt-dlp failed")
  })
 })
}

// ======================
// CATBOX UPLOAD
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
  "youtube.com",
  "youtu.be",
  "vimeo.com"
 ].some(d => url.includes(d))
}

// ======================
// ROOT
// ======================
app.get(BASE, (req, res) => {
 res.json({
  name: "MP4 API SYSTEM",
  status: "online",
  yt_dlp_path: YTDLP,
  endpoints: {
   download: BASE + "/download?url=",
   support: BASE + "/support",
   queue: BASE + "/queue",
   health: BASE + "/health"
  }
 })
})

// ======================
// DOWNLOAD
// ======================
app.get(BASE + "/download", (req, res) => {
 const url = decodeURIComponent(req.query.url || "")

 if (!url) return res.json({ status: "error", msg: "no url" })
 if (!checkSupport(url)) return res.json({ status: "error", msg: "unsupported" })

 const file = `video_${Date.now()}.mp4`

 const job = async () => {
  try {
   console.log("📥 Download:", url)

   await downloadVideo(url, file)

   console.log("☁️ Upload...")

   const result = await uploadCatbox(file)

   fs.unlinkSync(file)

   res.json({
    status: "success",
    url: result
   })

  } catch (e) {
   console.log("❌ ERROR:", e)
   res.json({
    status: "error",
    message: String(e)
   })
  }
 }

 queue.push(job)
 processQueue()
})

// ======================
// SUPPORT
// ======================
app.get(BASE + "/support", (req, res) => {
 res.json({
  supported: [
   "tiktok",
   "instagram",
   "facebook",
   "twitter",
   "youtube",
   "vimeo"
  ],
  features: {
   mp4: true,
   ffmpeg: true,
   yt_dlp: true,
   queue: true
  }
 })
})

// ======================
// QUEUE
// ======================
app.get(BASE + "/queue", (req, res) => {
 res.json({
  waiting: queue.length,
  running
 })
})

// ======================
// HEALTH
// ======================
app.get(BASE + "/health", (req, res) => {
 res.json({
  status: "online",
  uptime: process.uptime()
 })
})

// ======================
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━")
 console.log("🚀 MP4 API READY")
 console.log("🔧 yt-dlp:", YTDLP)
 console.log("📥 /home/api/download?url=")
 console.log("━━━━━━━━━━━━━━━━")
})
