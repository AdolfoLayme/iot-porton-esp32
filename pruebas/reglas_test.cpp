#include "porton_reglas.h"
#include <cassert>
#include <cstdio>

void parar_gana_siempre() {
  Reglas r; r.decidir({"A", Orden::Abrir, 0, 1000}, 30, 30, false);
  auto d = r.decidir({"B", Orden::Parar, 0, 1100}, 40, 100, false);
  assert(d.resultado == Resultado::Aceptada && d.objetivoPct == 40);
  assert(!r.turno() && !std::strcmp(d.motivo, "parar gana siempre"));
}
void obstaculo_bloquea_cerrar() {
  Reglas r;
  assert(r.decidir({"A", Orden::Cerrar, 0, 1000}, 50, 50, true).resultado == Resultado::Bloqueada);
  assert(r.decidir({"A", Orden::Abrir, 0, 1400}, 50, 50, true).resultado == Resultado::Aceptada);
}
void turno_rechaza_a_otro() {
  Reglas r; char usuario[] = "A";
  r.decidir({usuario, Orden::Abrir, 0, 1000}, 30, 30, false); usuario[0] = 'Z';
  assert(r.decidir({"B", Orden::Cerrar, 0, 1400}, 40, 100, false).resultado == Resultado::Ocupado);
  assert(!std::strcmp(r.turno(), "A"));
}
void turno_permite_al_duenio() {
  Reglas r; r.decidir({"A", Orden::Abrir, 0, 1000}, 30, 30, false);
  auto d = r.decidir({"A", Orden::Cerrar, 0, 1400}, 40, 100, false);
  assert(d.resultado == Resultado::Aceptada && d.esperarMs == 400);
}
void quieto_cualquiera_manda() {
  Reglas r; r.decidir({"A", Orden::Abrir, 0, 1000}, 30, 30, false); r.finMovimiento();
  assert(r.decidir({"B", Orden::Cerrar, 0, 1400}, 100, 100, false).resultado == Resultado::Aceptada);
}
void antirrebote_mismo_usuario() {
  Reglas r; r.decidir({"A", Orden::Abrir, 0, 1000}, 30, 30, false);
  assert(r.decidir({"A", Orden::Abrir, 0, 1200}, 40, 100, false).resultado == Resultado::Ignorada);
  assert(r.decidir({"B", Orden::Abrir, 0, 1250}, 40, 100, false).resultado == Resultado::Ocupado);
  assert(r.decidir({"A", Orden::Abrir, 0, 1400}, 40, 100, false).resultado == Resultado::Aceptada);
  assert(r.decidir({"A", Orden::Parar, 0, 1401}, 40, 100, false).resultado == Resultado::Aceptada);
}
void ir_a_pct_acota() {
  Reglas r;
  assert(r.decidir({"A", Orden::Ir, 150, 1000}, 30, 30, false).objetivoPct == 100);
  assert(r.decidir({"A", Orden::Ir, -5, 1400}, 40, 100, false).objetivoPct == 0);
}
int main() {
  parar_gana_siempre(); obstaculo_bloquea_cerrar(); turno_rechaza_a_otro();
  turno_permite_al_duenio(); quieto_cualquiera_manda(); antirrebote_mismo_usuario(); ir_a_pct_acota();
  std::puts("7/7 reglas OK");
}
