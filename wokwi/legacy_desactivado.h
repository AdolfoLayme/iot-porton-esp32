// DESACTIVADO 2026-10-20: firmware original conservado como referencia; nuevo contrato y reglas.
// // Portón automático IoT — ESP32 + servo + MQTT (simulado en Wokwi)
// // Topics (prefijo TOPIC):
// //   <p>/cmd     <- "abrir" | "cerrar" | "parar" | "pos:0-100" | "ping:<id>"
// //   <p>/estado  -> JSON retenido con posición, estado, distancia
// //   <p>/pong    -> eco de "ping:<id>" (para medir latencia)
// //   <p>/online  -> "1" / "0" (LWT)
// 
// #include <WiFi.h>
// #include <PubSubClient.h>
// #include <ESP32Servo.h>
// #include <LiquidCrystal_I2C.h>
// 
// const char* BROKER = "broker.emqx.io";
// const char* TOPIC  = "porton-adolfo-7f3k";   // cambiar si se comparte el broker público
// 
// const int PIN_SERVO = 18;
// const int PIN_BTN_ABRIR = 32, PIN_BTN_CERRAR = 33, PIN_BTN_PARAR = 25;
// const int PIN_TRIG = 5, PIN_ECHO = 19;
// const int PIN_LED_VERDE = 27, PIN_LED_ROJO = 26;
// 
// const int ANGULO_ABIERTO = 90;      // calibrar con el portón real
// const int PASO_MS = 15;             // ms por grado: velocidad del portón
// const int DIST_OBSTACULO_CM = 20;   // al cerrar, si hay algo más cerca, reabre
// 
// WiFiClient wifi;
// PubSubClient mqtt(wifi);
// Servo servo;
// LiquidCrystal_I2C lcd(0x27, 16, 2);
// 
// int angulo = 0, objetivo = 0;
// float distancia = 400;
// String estado = "cerrado";
// unsigned long tPaso = 0, tSensor = 0, tPublica = 0;
// bool cambio = true;
// 
// String topic(const char* sub) { return String(TOPIC) + "/" + sub; }
// 
// void irA(int pct, const char* motivo) {
//   objetivo = constrain(pct, 0, 100) * ANGULO_ABIERTO / 100;
//   if (objetivo > angulo) estado = "abriendo";
//   else if (objetivo < angulo) estado = "cerrando";
//   mqtt.publish(topic("evento").c_str(), motivo);
//   cambio = true;
// }
// 
// void parar(const char* motivo) {
//   objetivo = angulo;
//   estado = "detenido";
//   mqtt.publish(topic("evento").c_str(), motivo);
//   cambio = true;
// }
// 
// void alRecibir(char* t, byte* data, unsigned int len) {
//   String msg;
//   for (unsigned int i = 0; i < len; i++) msg += (char)data[i];
//   msg.trim();
//   if (msg.startsWith("ping:")) { mqtt.publish(topic("pong").c_str(), msg.c_str()); return; }
//   if (msg == "abrir") irA(100, "Orden remota: abrir");
//   else if (msg == "cerrar") irA(0, "Orden remota: cerrar");
//   else if (msg == "parar") parar("Orden remota: parar");
//   else if (msg.startsWith("pos:")) irA(msg.substring(4).toInt(), ("Orden remota: " + msg).c_str());
// }
// 
// void conectar() {
//   if (WiFi.status() != WL_CONNECTED) {
//     lcd.clear(); lcd.print("WiFi...");
//     WiFi.begin("Wokwi-GUEST", "", 6);
//     while (WiFi.status() != WL_CONNECTED) delay(100);
//   }
//   while (!mqtt.connected()) {
//     lcd.clear(); lcd.print("MQTT...");
//     String id = "porton-esp32-" + String((uint32_t)esp_random(), HEX);
//     if (mqtt.connect(id.c_str(), topic("online").c_str(), 1, true, "0")) {
//       mqtt.publish(topic("online").c_str(), "1", true);
//       mqtt.subscribe(topic("cmd").c_str());
//       cambio = true;
//     } else delay(1000);
//   }
// }
// 
// float medirDistancia() {
//   digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
//   digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
//   digitalWrite(PIN_TRIG, LOW);
//   long us = pulseIn(PIN_ECHO, HIGH, 30000);
//   return us ? us / 58.0 : 400;
// }
// 
// // true solo en el instante en que se aprieta (flanco), no mientras se mantiene
// bool apretado(int pin, bool& antes) {
//   bool ahora = digitalRead(pin) == LOW;
//   bool flanco = ahora && !antes;
//   antes = ahora;
//   return flanco;
// }
// 
// void leerBotones() {
//   static bool a = false, c = false, p = false;
//   if (apretado(PIN_BTN_ABRIR, a)) irA(100, "Botón local: abrir");
//   if (apretado(PIN_BTN_CERRAR, c)) irA(0, "Botón local: cerrar");
//   if (apretado(PIN_BTN_PARAR, p)) parar("Botón local: parar");
// }
// 
// void publicarEstado() {
//   int pct = angulo * 100 / ANGULO_ABIERTO;
//   char json[160];
//   snprintf(json, sizeof(json),
//            "{\"pos\":%d,\"objetivo\":%d,\"estado\":\"%s\",\"dist\":%.0f}",
//            pct, objetivo * 100 / ANGULO_ABIERTO, estado.c_str(), distancia);
//   mqtt.publish(topic("estado").c_str(), json, true);
// 
//   lcd.setCursor(0, 0); lcd.printf("%-10s %3d%%  ", estado.c_str(), pct);
//   lcd.setCursor(0, 1); lcd.printf("Dist: %3.0f cm    ", distancia);
// }
// 
// void setup() {
//   pinMode(PIN_BTN_ABRIR, INPUT_PULLUP);
//   pinMode(PIN_BTN_CERRAR, INPUT_PULLUP);
//   pinMode(PIN_BTN_PARAR, INPUT_PULLUP);
//   pinMode(PIN_TRIG, OUTPUT);
//   pinMode(PIN_ECHO, INPUT);
//   pinMode(PIN_LED_VERDE, OUTPUT);
//   pinMode(PIN_LED_ROJO, OUTPUT);
// 
//   servo.attach(PIN_SERVO, 500, 2400);
//   servo.write(angulo);
//   lcd.init(); lcd.backlight();
// 
//   mqtt.setServer(BROKER, 1883);
//   mqtt.setCallback(alRecibir);
//   conectar();
// }
// 
// void loop() {
//   if (!mqtt.connected()) conectar();
//   mqtt.loop();
//   leerBotones();
// 
//   unsigned long ahora = millis();
// 
//   if (ahora - tSensor >= 200) {
//     tSensor = ahora;
//     float d = medirDistancia();
//     if (abs(d - distancia) >= 2) cambio = true;
//     distancia = d;
//     if (estado == "cerrando" && distancia < DIST_OBSTACULO_CM) {
//       irA(100, "Obstáculo detectado: reabriendo");
//       estado = "obstaculo";
//     }
//   }
// 
//   if (ahora - tPaso >= PASO_MS && angulo != objetivo) {
//     tPaso = ahora;
//     angulo += (objetivo > angulo) ? 1 : -1;
//     servo.write(angulo);
//     if (angulo == objetivo) {
//       estado = angulo == 0 ? "cerrado" : (angulo == ANGULO_ABIERTO ? "abierto" : "detenido");
//       cambio = true;
//     }
//   }
// 
//   bool moviendo = angulo != objetivo;
//   digitalWrite(PIN_LED_ROJO, moviendo && (ahora / 250) % 2);   // parpadea en movimiento
//   digitalWrite(PIN_LED_VERDE, estado == "abierto");
// 
//   // En movimiento publica cada 150 ms; quieto, solo si algo cambió
//   if ((moviendo && ahora - tPublica >= 150) || cambio) {
//     tPublica = ahora;
//     cambio = false;
//     publicarEstado();
//   }
// }
