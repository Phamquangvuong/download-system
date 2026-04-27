const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn, execSync } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// SAFE YT-DLP PATH (FIX ENOENT 100%)
// ======================
function getYtDlp() {
 try {
  return execSync("which yt-dlp").toString().trim()
 } catch {
  return "yt-dlp"
 }
}

const YTDLP = getYtDlp()

// ======================
// JOB STORE (NO 502)
// ======================
const jobs = {}

// ======================
// QUEUE SYSTEM (SAFE)
// ======================
let queue = []
let running = false

function runQueue() {
 if (running) return
 if (!queue.length) return

 running = true
 const job = queue.shift()

 Promise.resolve(job())
  .catch(console.error)
  .finally(() => {
   running = false
   runQueue()
  })
}

// ======================
// DOWNLOAD MP4 (yt-dlp + ffmpeg)
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

  yt.on("error", reject)

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
  name: "PRODUCTION MP4 API",
  status: "stable",
  yt_dlp: YTDLP,
  endpoints: {
   download: BASE + "/download?url=",
   status: BASE + "/status?id=",
   queue: BASE + "/queue",
   health: BASE + "/health",
   test: BASE + "/test"
  }
 })
})

// ======================
// DOWNLOAD (QUEUE + NO 502)
// ======================
app.get(BASE + "/download", (req, res) => {
 const url = decodeURIComponent(req.query.url || "")
 if (!url) return res.json({ error: "no url" })
 if (!checkSupport(url)) return res.json({ error: "unsupported" })

 const id = Date.now().toString()
 const file = `video_${id}.mp4`

 jobs[id] = {
  status: "processing",
  result: null
 }

 queue.push(async () => {
  try {
   console.log("📥 Download:", url)

   await downloadVideo(url, file)

   console.log("☁️ Upload...")

   const result = await uploadCatbox(file)

   fs.unlinkSync(file)

   jobs[id] = {
    status: "done",
    result
   }

  } catch (e) {
   console.log("❌ ERROR:", e)

   jobs[id] = {
    status: "error",
    result: String(e)
   }
  }
 })

 runQueue()

 res.json({
  status: "queued",
  id
 })
})

// ======================
// STATUS CHECK
// ======================
app.get(BASE + "/status", (req, res) => {
 const id = req.query.id
 if (!id) return res.json({ error: "no id" })

 res.json(jobs[id] || { error: "not found" })
})

// ======================
// QUEUE INFO
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
// TEST YTDLP
// ======================
app.get(BASE + "/test", (req, res) => {
 try {
  res.json({
   yt_dlp_path: YTDLP,
   version: execSync("yt-dlp --version").toString(),
   ffmpeg: execSync("ffmpeg -version").toString().split("\n")[0]
  })
 } catch (e) {
  res.json({ error: String(e) })
 }
})

// ======================
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━━━━━")
 console.log("🚀 PRODUCTION API READY")
 console.log("🔧 yt-dlp:", YTDLP)
 console.log("📥 /home/api/download?url=")
 console.log("📊 /home/api/status?id=")
 console.log("━━━━━━━━━━━━━━━━━━━━")
})
