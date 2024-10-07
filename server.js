const mqtt = require('mqtt');
const sql = require('mssql');
const express = require('express');
const app = express();
const port = 3000;  // Port for the web interface

// MQTT Server Configuration
const brokerUrl = 'mqtt://13.127.138.244';  // Adjust to your broker's IP
const mqttServer = mqtt.connect(brokerUrl);

// MSSQL Database Configuration
const dbConfig = {
    user: 'easytime',
    password: '6Ifm2l~36',
    server: '146.88.24.73',  // e.g., 'localhost' or a remote server
    database: 'easytime',
    options: {
        encrypt: true,  // Use this if you're on Azure or a secure connection
        trustServerCertificate: true  // Set to true if using self-signed certificate
    }
};

// Connect to the database
sql.connect(dbConfig).then(pool => {
    if (pool.connected) {
        console.log('Connected to the MSSQL database.');
    }

    mqttServer.on('connect', () => {
        console.log('MQTT server connected.');
        // Subscribe to get LED status
        mqttServer.subscribe('device/led/status', err => {
            if (!err) {
                console.log('Subscribed to LED status.');
            }
        });
    });

    // Store the latest LED status
    let ledStatus = 'off';

    // Handle incoming messages
    mqttServer.on('message', (topic, message) => {
        if (topic === 'device/led/status') {
            ledStatus = message.toString();
            console.log(`LED status updated: ${ledStatus}`);
        }
    });

    // Serve the HTML page to control the LED
    app.get('/', (req, res) => {
        res.send(`
            <html>
            <body>
                <h1>Control LED</h1>
                <button onclick="sendCommand('on')">Turn ON</button>
                <button onclick="sendCommand('off')">Turn OFF</button>
                <h2>LED Status: <span id="status">${ledStatus}</span></h2>
                <script>
                    function sendCommand(command) {
                        fetch('/control/' + command)
                            .then(response => response.json())
                            .then(data => {
                                document.getElementById('status').innerText = data.status;
                            });
                    }
                </script>
            </body>
            </html>
        `);
    });

    // Handle LED control via HTTP
    app.get('/control/:command', (req, res) => {
        const command = req.params.command;
        if (command === 'on' || command === 'off') {
            mqttServer.publish('device/led/control', command);  // Publish the command to the ESP8266
            res.json({ status: command });
        } else {
            res.status(400).json({ error: 'Invalid command' });
        }
    });

    // Start the web server
    app.listen(port, () => {
        console.log(`Web server running on http://localhost:${port}`);
    });

}).catch(err => {
    console.error('Database connection error:', err);
});
