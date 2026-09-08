export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.statusCode = 200
  res.end(JSON.stringify({ authRequired: false, authenticated: true }))
}
