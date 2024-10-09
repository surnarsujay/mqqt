#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// Wi-Fi credentials
const char* ssid = "Lissomtech_work_2.5G";
const char* password = "#Lissom@3111";

// MQTT server details
const char* mqtt_server = "13.127.138.244";  // Replace with your EC2 IP

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  // Start the serial communication for debugging
  Serial.begin(115200);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  // Try connecting to Wi-Fi
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message;

  // Convert payload to string
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Message arrived on topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);

  // Check the message and control GPIO accordingly
  if (message == "ON") {
    Serial.println("Turning GPIO ON");
    digitalWrite(D1, HIGH); // Turn GPIO pin ON
  } else if (message == "OFF") {
    Serial.println("Turning GPIO OFF");
    digitalWrite(D1, LOW);  // Turn GPIO pin OFF
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP8266Client")) {
      Serial.println("connected");
      // Subscribe to control topic for the device
      client.subscribe("esp8266/{1}/control");  // Replace with deviceID
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  // Initialize GPIO pin
  pinMode(D1, OUTPUT);
  digitalWrite(D1, LOW);  // Turn off GPIO pin initially

  // Setup Wi-Fi and MQTT connection
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  // Connect to MQTT broker
  reconnect();
}

void loop() {
  // Ensure the client is connected to the MQTT broker
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Publish data to MQTT topic
  String data = "Temperature: 25.5";
  Serial.print("Publishing data: ");
  Serial.println(data);
  client.publish("esp8266/{1}/data", data.c_str());  // Replace with deviceID

  delay(5000); // Delay between publishing data
}
