const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")
const { spawn, execSync } = require("child_process")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// YT-DLP PATH SAFE
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
// DOWNLOAD VIDEO
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
   else reject("download failed")
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
// ROOT
// ======================
app.get(BASE, (req, res) => {
 res.json({
  status: "online",
  mode: "direct-return",
  endpoints: {
   download: BASE + "/download?url="
  }
 })
})

// ======================
// DIRECT DOWNLOAD (NO QUEUE, NO ID)
// ======================
app.get(BASE + "/download", async (req, res) => {
 const url = decodeURIComponent(req.query.url || "")

 if (!url) {
  return res.json({ status: "error", msg: "no url" })
 }

 if (!checkSupport(url)) {
  return res.json({ status: "error", msg: "unsupported" })
 }

 const file = `video_${Date.now()}.mp4`

 try {
  console.log("📥 Download:", url)

  await downloadVideo(url, file)

  console.log("☁️ Upload...")

  const result = await uploadCatbox(file)

  fs.unlinkSync(file)

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
app.listen(PORT, () => {
 console.log("━━━━━━━━━━━━━━━━")
 console.log("🚀 DIRECT API MODE")
 console.log("📥 /home/api/download?url=")
 console.log("━━━━━━━━━━━━━━━━")
})
