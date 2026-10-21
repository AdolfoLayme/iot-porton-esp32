#pragma once
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
const int PIN_SERVO = 18, PIN_TRIG = 5, PIN_ECHO = 19;
const int PIN_BTN_ABRIR = 32, PIN_BTN_CERRAR = 33, PIN_BTN_PARAR = 25;
const int PIN_LED_VERDE = 27, PIN_LED_ROJO = 26;
Servo servo;
LiquidCrystal_I2C lcd(0x27, 16, 2);
int angulo = ANGULO_CERRADO, objetivo = ANGULO_CERRADO;
float distancia = 400;
bool obstaculo = false, verde = false, rojo = false, cambio = true;
uint32_t tPaso = 0, tSensor = 0, tPublica = 0, tPausa = 0, pausaMs = 0;
int porcentaje(int grados) { return (grados - ANGULO_CERRADO) * 100 / (ANGULO_ABIERTO - ANGULO_CERRADO); }
const char* estadoActual() {
  if (angulo != objetivo && millis() - tPausa < pausaMs) return "pausa";
  if (objetivo > angulo) return ANGULO_ABIERTO > ANGULO_CERRADO ? "abriendo" : "cerrando";
  if (objetivo < angulo) return ANGULO_ABIERTO > ANGULO_CERRADO ? "cerrando" : "abriendo";
  return angulo == ANGULO_CERRADO ? "cerrado" : (angulo == ANGULO_ABIERTO ? "abierto" : "detenido");
}
float medirDistancia() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10); digitalWrite(PIN_TRIG, LOW);
  long us = pulseIn(PIN_ECHO, HIGH, 25000);
  return us ? us / 58.0f : 400;
}
bool apretado(int pin, bool& antes) {
  bool ahora = digitalRead(pin) == LOW, flanco = ahora && !antes; antes = ahora; return flanco;
}
void iniciarFisica() {
  pinMode(PIN_BTN_ABRIR, INPUT_PULLUP); pinMode(PIN_BTN_CERRAR, INPUT_PULLUP);
  pinMode(PIN_BTN_PARAR, INPUT_PULLUP); pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED_VERDE, OUTPUT); pinMode(PIN_LED_ROJO, OUTPUT);
  servo.attach(PIN_SERVO, 500, 2400); servo.write(angulo); lcd.init(); lcd.backlight();
}
