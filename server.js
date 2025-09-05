import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import twilio from 'twilio';
import dotenv from 'dotenv';
import fetch from 'node-fetch';   // ✅ added for ngrok auto-detect

dotenv.config();
console.log("SID:", process.env.TWILIO_ACCOUNT_SID ? "Loaded" : "Missing");
console.log("TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "Loaded" : "Missing");
console.log("PHONE:", process.env.TWILIO_PHONE_NUMBER ? "Loaded" : "Missing");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 3000;

// --- Twilio Configuration ---
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// --- Database Setup ---
const dbPromise = open({
  filename: join(__dirname, 'bettersafe.db'),
  driver: sqlite3.Database
});

async function setupDb() {
  const db = await dbPromise;
  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      userId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      acc REAL NOT NULL,
      ts TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES contacts (userId) ON DELETE CASCADE
    );
  `);
  console.log('Database ready.');
}

app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// --- Contact Endpoints ---
app.get('/contacts', async (req, res) => {
  const db = await dbPromise;
  const contactsList = await db.all('SELECT * FROM contacts ORDER BY name');
  const contacts = contactsList.reduce((acc, contact) => {
    acc[contact.userId] = { name: contact.name, phone: contact.phone };
    return acc;
  }, {});
  res.json(contacts);
});

app.post('/contacts', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('Name and phone are required');
  
  const userId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const db = await dbPromise;
  await db.run('INSERT INTO contacts (userId, name, phone) VALUES (?, ?, ?)', [userId, name, phone]);
  
  io.emit('contacts_updated');
  res.status(201).json({ userId, name, phone });
});

app.put('/contacts/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).send('Name and phone are required');

    const db = await dbPromise;
    await db.run('UPDATE contacts SET name = ?, phone = ? WHERE userId = ?', [name, phone, userId]);
    
    io.emit('contacts_updated');
    res.status(200).send('Contact updated');
});

app.delete('/contacts/:userId', async (req, res) => {
    const { userId } = req.params;
    const db = await dbPromise;
    await db.run('DELETE FROM contacts WHERE userId = ?', [userId]);
    
    io.emit('contacts_updated');
    res.status(200).send('Contact deleted');
});

// --- Location Endpoints ---
app.post('/location', async (req, res) => {
  const { userId, lat, lng, acc, ts } = req.body;
  if (!userId || lat === undefined || lng === undefined) return res.status(400).send('Invalid data');

  const db = await dbPromise;
  await db.run('INSERT INTO locations (userId, lat, lng, acc, ts) VALUES (?, ?, ?, ?, ?)', [userId, lat, lng, acc, ts]);
  res.status(200).send('Location received');
});

app.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = await dbPromise;
  const history = await db.all('SELECT lat, lng, acc, ts FROM locations WHERE userId = ? ORDER BY ts', [userId]);
  res.json(history || []);
});

app.delete('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = await dbPromise;
  await db.run('DELETE FROM locations WHERE userId = ?', [userId]);
  
  io.to(userId).emit('history_cleared');
  console.log(`History cleared for ${userId}`);
  res.status(200).send('History cleared');
});

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });

  socket.on('send_emergency_alert', async ({ userId, contactName }) => {
  try {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.warn('Twilio credentials are missing. Skipping SMS send.');
      io.emit('emergency_started', { userId, contactName });
      return;
    }

    const db = await dbPromise;
    const contact = await db.get('SELECT phone, name FROM contacts WHERE userId = ?', userId);

    if (contact && contact.phone) {
      const formattedNumber = contact.phone.startsWith('+')
        ? contact.phone
        : `+91${contact.phone}`;

      // Use PUBLIC_URL from environment or fallback to localhost
      const trackingLink = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/receiver.html?track=${userId}`;

      const messageBody = `🚨 EMERGENCY ALERT: ${contact.name} has started sharing their location with you. View live location: ${trackingLink}`;

      await client.messages.create({
        body: messageBody,
        from: twilioPhoneNumber,
        to: formattedNumber
      });

      console.log(`Emergency SMS sent to ${formattedNumber} for user ${userId}`);
      io.emit('emergency_started', { userId, contactName: contact.name });
    }
  } catch (error) {
    console.error('Failed to send SMS via Twilio:', error);
  }
});


  socket.on('location_update', (data) => {
    const { userId } = data;
    if (userId) {
      io.to(userId).emit('location_update', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Server Startup ---
setupDb().then(() => {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
