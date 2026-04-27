const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn, execSync } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// GET YT-DLP PATH SAFE
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
// CHECK SUPPORT
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
// DOWNLOAD CORE (FIXED YOUTUBE)
// ======================
function downloadVideo(url, file) {
 return new Promise((resolve, reject) => {
  const yt = spawn(YTDLP, [
   "-f", "bv*+ba/b",
   "--merge-output-format", "mp4",
   "--no-playlist",

   // 🍪 COOKIE FIX
   "--cookies", "cookies.txt",

   // 🔥 BYPASS YOUTUBE BOT CHECK
   "--extractor-args",
   "youtube:player_client=android,player_skip=webpage",

   // ⚡ STABILITY
   "--user-agent", "Mozilla/5.0",
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
   else reject("yt-dlp failed with code " + code)
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
// ROOT API (FULL ENDPOINT)
// ======================
app.get(BASE, (req, res) => {
 res.json({
  dev: "Pham Quang Vuong",
  status: "online",
  mode: "API DOWNLOAD SYSTEM V1",

  endpoints: {
   download: BASE + "/download?url=",
   support: BASE + "/support",
   queue: BASE + "/queue",
   health: BASE + "/health"
  }
 })
})

// ======================
// DOWNLOAD ROUTE
// ======================
app.get(BASE + "/download", async (req, res) => {
 const url = decodeURIComponent(req.query.url || "")

 if (!url) return res.json({ status: "error", message: "no url" })
 if (!checkSupport(url)) return res.json({ status: "error", message: "unsupported url" })

 const file = `video_${Date.now()}.mp4`

 try {
  console.log("📥 Download:", url)

  await downloadVideo(url, file)

  console.log("☁️ Uploading...")

  const result = await uploadCatbox(file)

  if (fs.existsSync(file)) fs.unlinkSync(file)

  return res.json({
   status: "success",
   url: result
  })

 } catch (err) {
  console.log("❌ ERROR:", err)

  if (fs.existsSync(file)) fs.unlinkSync(file)

  return res.json({
   status: "error",
   message: String(err)
  })
 }
})

// ======================
// SUPPORT
// ======================
app.get(BASE + "/support", (req, res) => {
 res.json({
  supported: [
   "youtube",
   "tiktok",
   "instagram",
   "facebook",
   "twitter",
   "vimeo"
  ],
  features: {
   cookies: true,
   android_client: true,
   mp4: true,
   ffmpeg_merge: true
  }
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
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━━━━━")
 console.log("🚀 PRODUCTION VIDEO API")
 console.log("🍪 cookies + android bypass enabled")
 console.log("📥 /home/api/download?url=")
 console.log("━━━━━━━━━━━━━━━━━━━━")
})
