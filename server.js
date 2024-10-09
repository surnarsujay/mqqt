const aedes = require('aedes')();
const net = require('net');
const ws = require('ws');
const http = require('http');
const mqtt = require('mqtt');
const bodyParser = require('body-parser'); // For parsing POST requests

const mqttPort = 1883;
const wsPort = 3000;
const httpPort = 8080;

// In-memory list of devices (ID, name, subscribed topic, GPIO state, etc.)
let devices = [];

// MQTT broker setup
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(mqttPort, function () {
  console.log(`MQTT broker running on port ${mqttPort}`);
});

// WebSocket server setup for real-time data
const wss = new ws.Server({ port: wsPort });
wss.on('connection', function (socket) {
  console.log('WebSocket client connected');
  socket.on('message', function (message) {
    console.log('Received from WebSocket:', message);
  });
});

// Handle incoming MQTT messages and forward them to WebSocket clients
aedes.on('publish', function (packet, client) {
  const topic = packet.topic;
  const message = packet.payload.toString();
  console.log(`Received MQTT message: ${message} on topic ${topic}`);

  // Broadcast data to all WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify({ topic, message }));
    }
  });
});

// REST API to add, delete, and manage devices via the webpage
const express = require('express');
const app = express();
app.use(bodyParser.json());

// Add a new device
app.post('/devices', (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).send('Device ID and Name are required');
  }

  // Check if the device already exists
  const existingDevice = devices.find(device => device.id === id);
  if (existingDevice) {
    return res.status(400).send('Device already exists');
  }

  // Add the new device
  const newDevice = { id, name, topic: `esp8266/${id}/control`, state: 'OFF' };
  devices.push(newDevice);

  res.status(201).send(newDevice);
});

// Delete a device
app.delete('/devices/:id', (req, res) => {
  const { id } = req.params;

  const deviceIndex = devices.findIndex(device => device.id === id);
  if (deviceIndex === -1) {
    return res.status(404).send('Device not found');
  }

  devices.splice(deviceIndex, 1);
  res.status(200).send('Device deleted');
});

// Get the list of devices
app.get('/devices', (req, res) => {
  res.status(200).json(devices);
});

// Control a device's GPIO (turn LED ON/OFF)
app.post('/devices/:id/control', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const device = devices.find(device => device.id === id);
  if (!device) {
    return res.status(404).send('Device not found');
  }

  // Send control message via MQTT
  mqttClient.publish(device.topic, action);
  device.state = action; // Update in-memory device state
  res.status(200).send(`Device ${id} turned ${action}`);
});

// Start the HTTP server for the REST API
app.listen(httpPort, () => {
  console.log(`HTTP server running on port ${httpPort}`);
});

// MQTT Client to control devices
const mqttClient = mqtt.connect('mqtt://localhost');
