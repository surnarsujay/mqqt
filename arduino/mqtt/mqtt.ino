#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// WiFi credentials
const char* ssid = "Lissomtech_work_2.5G";  // Your WiFi SSID
const char* password = "#Lissom@3111";       // Your WiFi password

// MQTT server details
const char* mqtt_server = "192.168.0.116";   // IP address of your MQTT broker

WiFiClient espClient;
PubSubClient client(espClient);

const int ledPin = D1;  // Pin where the LED is connected
String ledStatus = "off";  // Initial LED status

void setup() {
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);  // Turn the LED off initially
  
  Serial.begin(115200);  // Start Serial for monitoring
  setup_wifi();
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(mqtt_callback);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);

  if (String(topic) == "device/led/control") {
    if (message == "on") {
      digitalWrite(ledPin, HIGH);  // Turn LED on
      ledStatus = "on";
    } else if (message == "off") {
      digitalWrite(ledPin, LOW);  // Turn LED off
      ledStatus = "off";
    }

    // Publish the current status of the LED
    client.publish("device/led/status", ledStatus.c_str());
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP8266Client")) {
      Serial.println("connected");
      // Subscribe to control topic after connection
      client.subscribe("device/led/control");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}
