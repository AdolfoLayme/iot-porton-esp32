#pragma once
#define MODO_SEGURO 0
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";
const char* TOPIC_BASE = "porton-dev-a6d9f031";
const char* MQTT_TOKEN = "";
const char* URL_REGISTRAR = "";  // Integración de historial persistente en fase B.
const char* SECRETO_DISPOSITIVO = "";
const int ANGULO_CERRADO = 0, ANGULO_ABIERTO = 90;
const int PASO_MS = 15, DIST_OBSTACULO_CM = 20;
const uint32_t PAUSA_INVERSION_MS = 400;
// El certificado público se incluye en flespi_ca.h, comprobado el 2026-10-20.
#include "flespi_ca.h"
