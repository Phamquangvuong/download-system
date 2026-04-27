const express = require("express")
const fs = require("fs")
const axios = require("axios")
const FormData = require("form-data")

const app = express()
const PORT = process.env.PORT || 3000

const BASE = "/home/api"

// ======================
// QUEUE SYSTEM (SAFE)
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
// SUPPORT CHECK (SAFE ONLY)
// ======================
function checkSupport(url) {
 return [
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
// ROOT API
// ======================
app.get(BASE, (req, res) => {
 res.json({
  name: "DOWNLOAD API SYSTEM",
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
// DOWNLOAD (NOW SAFE MOCK FLOW)
// ======================
app.get(BASE + "/download", (req, res) => {
 const url = req.query.url
 if (!url) return res.json({ status: "error", message: "no url" })
 if (!checkSupport(url)) return res.json({ status: "error", message: "unsupported platform" })

 const job = async () => {
  try {
   // 👉 vì đã bỏ yt-dlp → dùng placeholder flow
   const fakeFile = `file_${Date.now()}.txt`
   fs.writeFileSync(fakeFile, `URL: ${url}`)

   console.log("📥 Processing:", url)

   const catbox = await uploadCatbox(fakeFile)

   fs.unlinkSync(fakeFile)

   res.json({
    status: "success",
    url: catbox
   })

  } catch (err) {
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
// SUPPORT
// ======================
app.get(BASE + "/support", (req, res) => {
 res.json({
  supported: [
   "tiktok",
   "instagram",
   "facebook",
   "twitter",
   "x",
   "vimeo"
  ],
  note: "youtube removed"
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
// HEALTH
// ======================
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
 console.log("🚀 API RUNNING")
 console.log("📥 /home/api/download?url=")
 console.log("📚 /home/api/support")
 console.log("📦 /home/api/queue")
 console.log("❤️ /home/api/health")
 console.log("━━━━━━━━━━━━━━━━")
})
