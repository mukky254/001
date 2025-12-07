const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// Route for all pages
app.get('*', (req, res) => {
    const file = req.path === '/' ? 'index.html' : req.path;
    res.sendFile(path.join(__dirname, file));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frontend server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
    console.log(`Backend API: https://zero0-1-r0xs.onrender.com`);
});
