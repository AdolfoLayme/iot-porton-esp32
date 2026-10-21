#pragma once
// La red corre fuera del bucle físico: un DNS/TLS/MQTT lento nunca bloquea PARAR.
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
struct MensajeRed { char tema[160]; char texto[1024]; bool retenido; };
QueueHandle_t entradaRed, salidaRed;
String tema(const char* sub) { return String(TOPIC_BASE) + "/" + sub; }
void emitir(const String& canal, const String& texto, bool retenido = false) {
  MensajeRed m{};
  canal.toCharArray(m.tema, sizeof(m.tema)); texto.toCharArray(m.texto, sizeof(m.texto));
  m.retenido = retenido;
  xQueueSend(salidaRed, &m, 0);
}
void recibirRed(char* canal, byte* datos, unsigned int longitud) {
  if (longitud >= 1024) return;
  MensajeRed m{}; strncpy(m.tema, canal, sizeof(m.tema) - 1);
  memcpy(m.texto, datos, longitud); xQueueSend(entradaRed, &m, 0);
}
void tareaRed(void*) {
#if MODO_SEGURO
  WiFiClientSecure transporte; transporte.setCACert(MQTT_CA_RAIZ);
#else
  WiFiClient transporte;
#endif
  PubSubClient cliente(transporte);
  cliente.setServer(MODO_SEGURO ? "mqtt.flespi.io" : "broker.emqx.io", MODO_SEGURO ? 8883 : 1883);
  cliente.setBufferSize(1400); cliente.setSocketTimeout(1); cliente.setKeepAlive(10);
  cliente.setCallback(recibirRed);
  uint32_t intento = millis() - 5000;
  // Canal 6 = red simulada de Wokwi (conecta al instante); en la maqueta busca el canal solo.
  if (!strcmp(WIFI_SSID, "Wokwi-GUEST")) WiFi.begin(WIFI_SSID, WIFI_PASS, 6); else WiFi.begin(WIFI_SSID, WIFI_PASS);
  bool avisado = false;
#if MODO_SEGURO
  configTime(0, 0, "pool.ntp.org", "time.google.com");
#endif
  for (;;) {
    if (WiFi.status() == WL_CONNECTED && !avisado) { avisado = true; Serial.printf("WiFi: conectado (%s)\n", WiFi.localIP().toString().c_str()); }
    if (WiFi.status() == WL_CONNECTED && !cliente.connected() && millis() - intento >= 3000) {
      intento = millis();
      String id = "porton-" + String((uint32_t)esp_random(), HEX);
#if MODO_SEGURO
      if (time(nullptr) < 1700000000) { Serial.println("MQTT: esperando la hora (NTP) para validar TLS"); continue; }
      bool ok = cliente.connect(id.c_str(), MQTT_TOKEN, "", tema("online").c_str(), 1, true, "0");
#else
      bool ok = cliente.connect(id.c_str(), tema("online").c_str(), 1, true, "0");
#endif
      Serial.printf("MQTT: %s (código %d)\n", ok ? "conectado" : "reintentando", cliente.state());
      if (ok) {
        cliente.subscribe(tema("cmd/+").c_str()); cliente.subscribe(tema("miembros").c_str());
        cliente.subscribe(tema("entorno").c_str());   // lo que el sensor "ve" en la casa 3D
        cliente.publish(tema("online").c_str(), "1", true);
        MensajeRed m{}; strcpy(m.tema, "reconexion"); xQueueSend(entradaRed, &m, 0);
      }
    }
    if (cliente.connected()) {
      cliente.loop(); MensajeRed m{};
      for (int i = 0; i < 8 && xQueueReceive(salidaRed, &m, 0) == pdTRUE; ++i)
        cliente.publish(m.tema, m.texto, m.retenido);
    } else {
      // Estado real se vuelve a publicar al reconectar; no reproducir órdenes/eventos viejos.
      xQueueReset(salidaRed);
    }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}
void iniciarRed() {
  entradaRed = xQueueCreate(16, sizeof(MensajeRed)); salidaRed = xQueueCreate(16, sizeof(MensajeRed));
  xTaskCreatePinnedToCore(tareaRed, "red", 12288, nullptr, 1, nullptr, 0);
}
