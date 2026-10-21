// Portón IoT: misma lógica en Wokwi y maqueta. Firmware anterior en legacy_desactivado.h.
#include "config.h"
#include "porton_reglas.h"
#include "red_firmware.h"
#include "fisica.h"
#include <ArduinoJson.h>
Reglas reglas(PAUSA_INVERSION_MS);
JsonDocument miembros;
// Entorno simulado (2026-10-21): la casa 3D publica en porton/entorno la distancia en cm desde el sensor hasta el
// carro cuando este cruza el haz. Se combina con el HC-SR04 (gana la menor) y caduca si deja de llegar.
float distanciaEntorno = 400; uint32_t tEntorno = 0;
const uint32_t ENTORNO_VALIDO_MS = 2500;

String nombreUsuario(const char* id) {
  if (!strcmp(id, "local")) return "Botón local";
  if (!strcmp(id, "sensor")) return "Sensor";
  return miembros[id].is<const char*>() ? miembros[id].as<String>() : "usuario";
}
void evento(const char* usuario, const String& orden, Resultado resultado, const char* motivo) {
  const char* resultados[] = {"aceptada", "ocupado", "bloqueada", "ignorada"};
  JsonDocument d; d["ts"] = millis(); d["usuario"] = usuario; d["orden"] = orden;
  d["resultado"] = resultados[(int)resultado]; d["motivo"] = motivo;
  String json; serializeJson(d, json); emitir(tema("evento"), json); Serial.println(json);
}
void solicitar(const char* usuario, Orden orden, int pct, const String& texto) {
  Decision d = reglas.decidir({usuario, orden, pct, millis()}, porcentaje(angulo), porcentaje(objetivo), obstaculo);
  if (d.resultado == Resultado::Aceptada) {
    objetivo = ANGULO_CERRADO + d.objetivoPct * (ANGULO_ABIERTO - ANGULO_CERRADO) / 100;
    if (d.esperarMs) { tPausa = millis(); pausaMs = d.esperarMs; }
    if (orden == Orden::Parar) pausaMs = 0;
    cambio = true;
  }
  evento(usuario, texto, d.resultado, d.motivo);
}
void procesarRed() {
  MensajeRed m{};
  for (int i = 0; i < 8 && xQueueReceive(entradaRed, &m, 0) == pdTRUE; ++i) {
    String canal(m.tema), texto(m.texto); texto.trim();
    if (canal == "reconexion") { cambio = true; continue; }
    if (canal == tema("entorno")) {
      float cm = texto.toFloat();
      distanciaEntorno = cm > 0 && cm < 400 ? cm : 400; tEntorno = millis(); continue;
    }
    if (canal == tema("miembros")) {
      JsonDocument nuevos;
      if (!deserializeJson(nuevos, texto) && nuevos.is<JsonObject>()) miembros = nuevos;
      cambio = true; continue;
    }
    String prefijo = tema("cmd/");
    if (!canal.startsWith(prefijo)) continue;
    String usuario = canal.substring(prefijo.length());
    if (!usuario.length() || usuario.length() > 40 || usuario.indexOf('/') >= 0) continue;
    if (texto.startsWith("{")) {
      JsonDocument d;
      if (deserializeJson(d, texto) || !d["orden"].is<const char*>()) continue;
      texto = d["orden"].as<String>();
    }
    if (texto.startsWith("ping:")) { emitir(tema(("pong/" + usuario).c_str()), texto); continue; }
    Orden orden;
    int pct = 0;
    if (texto == "abrir") orden = Orden::Abrir;
    else if (texto == "cerrar") orden = Orden::Cerrar;
    else if (texto == "parar") orden = Orden::Parar;
    else if (texto.startsWith("pos:")) {
      char* fin; long valor = strtol(texto.c_str() + 4, &fin, 10);
      if (fin == texto.c_str() + 4 || *fin || valor < 0 || valor > 100) {
        evento(usuario.c_str(), texto, Resultado::Bloqueada, "porcentaje inválido"); continue;
      }
      orden = Orden::Ir; pct = valor;
    } else { evento(usuario.c_str(), texto, Resultado::Bloqueada, "orden desconocida"); continue; }
    solicitar(usuario.c_str(), orden, pct, texto);
  }
}
void publicarEstado() {
  JsonDocument d;
  d["pos"] = porcentaje(angulo); d["objetivo"] = porcentaje(objetivo); d["estado"] = estadoActual();
  d["dist"] = (int)distancia; d["obstaculo"] = obstaculo;
  if (reglas.turno()) { d["turno"]["id"] = reglas.turno(); d["turno"]["nombre"] = nombreUsuario(reglas.turno()); }
  else d["turno"] = nullptr;
  d["led"]["verde"] = verde; d["led"]["rojo"] = rojo;
  String json; serializeJson(d, json); emitir(tema("estado"), json, true);
  lcd.setCursor(0, 0); lcd.printf("%-10s %3d%%  ", estadoActual(), porcentaje(angulo));
  lcd.setCursor(0, 1); lcd.printf("Dist: %3.0f cm    ", distancia);
}
void setup() {
  Serial.begin(115200); iniciarFisica(); iniciarRed();
}
void loop() {
  static bool a = false, c = false, p = false;
  // PARAR se lee después de otros botones para que gane también al pulsarlos juntos.
  procesarRed();
  if (apretado(PIN_BTN_ABRIR, a)) solicitar("local", Orden::Abrir, 100, "abrir");
  if (apretado(PIN_BTN_CERRAR, c)) solicitar("local", Orden::Cerrar, 0, "cerrar");
  if (apretado(PIN_BTN_PARAR, p)) solicitar("local", Orden::Parar, 0, "parar");
  uint32_t ahora = millis();
  if (ahora - tSensor >= 100) {
    tSensor = ahora; distancia = medirDistancia();
    if (ahora - tEntorno < ENTORNO_VALIDO_MS) distancia = min(distancia, distanciaEntorno);   // el carro en el haz
    bool anterior = obstaculo; obstaculo = distancia < DIST_OBSTACULO_CM;
    cambio = cambio || anterior != obstaculo;
    if (obstaculo && porcentaje(objetivo) < porcentaje(angulo)) {
      // Seguridad física libera el turno antes de reabrir, con la pausa de inversión.
      reglas.finMovimiento();
      solicitar("sensor", Orden::Abrir, 100, "abrir");
    }
  }
  if (ahora - tPaso >= (uint32_t)PASO_MS && ahora - tPausa >= pausaMs && angulo != objetivo) {
    tPaso = ahora; angulo += objetivo > angulo ? 1 : -1; servo.write(angulo);
    if (angulo == objetivo) { reglas.finMovimiento(); cambio = true; }
  }
  verde = angulo == ANGULO_ABIERTO && angulo == objetivo;
  bool nuevoRojo = obstaculo || (angulo != objetivo && (ahora / 250) % 2);
  cambio = cambio || nuevoRojo != rojo; rojo = nuevoRojo;
  digitalWrite(PIN_LED_VERDE, verde); digitalWrite(PIN_LED_ROJO, rojo);
  if (cambio || ahora - tPublica >= (angulo != objetivo ? 150U : 1000U)) {
    cambio = false; tPublica = ahora; publicarEstado();
  }
}
