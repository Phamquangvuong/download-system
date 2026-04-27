const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// QUEUE SYSTEM (STABLE)
// ======================
let queue = []
let running = false

function processQueue() {
 if (running) return
 if (queue.length === 0) return

 const job = queue.shift()
 running = true

 job().finally(() => {
  running = false
  processQueue()
 })
}

// ======================
// CLEAN URL
// ======================
function cleanURL(url) {
 try {
  const u = new URL(url)

  if (u.hostname.includes("youtube.com")) {
   const id = u.searchParams.get("v")
   if (id) return "https://www.youtube.com/watch?v=" + id
  }

  if (url.includes("facebook.com/share")) {
   return url.replace("facebook.com/share/v", "facebook.com/reel")
  }

  return url
 } catch {
  return url
 }
}

// ======================
// DOWNLOAD VIDEO (YT-DLP)
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
  ])

  yt.stderr.on("data", d => process.stdout.write(d))

  yt.on("close", code => {
   if (code === 0) resolve()
   else reject("download failed")
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
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "twitter.com",
  "x.com",
  "vimeo.com"
 ].some(d => url.includes(d))
}

// ======================
// ROUTES
// ======================

// 📥 DOWNLOAD
app.get(BASE, (req, res) => {
 res.json({
  name: "DOWNLOAD API SYSTEM BY QVUONG",
  base: BASE,
  endpoints: {
   download: BASE + "/download?url=",
   support: BASE + "/support",
   queue: BASE + "/queue",
   health: BASE + "/health"
  },
  example: {
   download: "GET " + BASE + "/download?url=https://..."
  },
  status: "online"
 })
})
app.get(BASE + "/download", (req, res) => {
 const url = req.query.url
 if (!url) return res.json({ status: "error", message: "no url" })
 if (!checkSupport(url)) return res.json({ status: "error", message: "unsupported" })

 const job = async () => {
  try {
   const clean = cleanURL(url)
   const file = "video_" + Date.now() + ".mp4"

   console.log("⬇️ Download:", clean)

   await download(clean, file)

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

// 📚 SUPPORT
app.get(BASE + "/support", (req, res) => {
 res.json({
  supported: [
   "youtube", "tiktok", "instagram",
   "facebook", "twitter", "x", "vimeo"
  ],
  features: {
   queue: true,
   upload: "catbox",
   auto_fix_url: true
  }
 })
})

// 📦 QUEUE STATUS
app.get(BASE + "/queue", (req, res) => {
 res.json({
  waiting: queue.length,
  running
 })
})

// ❤️ HEALTH
app.get(BASE + "/health", (req, res) => {
 res.json({
  status: "online",
  uptime: process.uptime()
 })
})

// ======================
// START
// ======================
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━")
 console.log("🚀 RENDER API RUNNING")
 console.log("📥 /home/api/download?url=")
 console.log("📚 /home/api/support")
 console.log("📦 /home/api/queue")
 console.log("❤️ /home/api/health")
 console.log("━━━━━━━━━━━━━━━━")
})
