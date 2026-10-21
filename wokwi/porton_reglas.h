#pragma once
#include <cstring>
#include <cstdint>

enum class Orden : uint8_t { Abrir, Cerrar, Parar, Ir };
enum class Resultado : uint8_t { Aceptada, Ocupado, Bloqueada, Ignorada };
struct Peticion { const char* usuario; Orden orden; int pct; uint32_t ms; };
struct Decision { Resultado resultado; const char* motivo; int objetivoPct; uint32_t esperarMs; };

class Reglas {
 public:
  explicit Reglas(uint32_t pausaInversionMs = 400, uint32_t antirreboteMs = 300)
    : pausa_(pausaInversionMs), rebote_(antirreboteMs) {}

  Decision decidir(const Peticion& p, int posPct, int objetivoPct, bool obstaculo) {
    if (p.orden == Orden::Parar) {
      finMovimiento();
      return {Resultado::Aceptada, "parar gana siempre", posPct, 0};
    }
    const int destino = p.orden == Orden::Abrir ? 100 :
      (p.orden == Orden::Cerrar ? 0 : acotar(p.pct));
    if (obstaculo && destino < posPct)
      return {Resultado::Bloqueada, "bloqueado por obstáculo", objetivoPct, 0};
    if (repetida(p)) return {Resultado::Ignorada, "orden repetida", objetivoPct, 0};
    if (turno_[0] && std::strcmp(turno_, p.usuario))
      return {Resultado::Ocupado, "ocupado", objetivoPct, 0};
    const bool invierte = (objetivoPct > posPct && destino < posPct) ||
                          (objetivoPct < posPct && destino > posPct);
    if (destino != posPct) copiar(turno_, p.usuario);
    else finMovimiento();
    return {Resultado::Aceptada, "aceptada", destino, invierte ? pausa_ : 0};
  }
  void finMovimiento() { turno_[0] = '\0'; }
  const char* turno() const { return turno_[0] ? turno_ : nullptr; }

 private:
  // Tabla acotada: suficiente para las 20 sesiones del broker previsto.
  struct Marca { char usuario[41]{}; uint32_t ms = 0; bool usada = false; } marcas_[32];
  uint32_t pausa_, rebote_;
  char turno_[41]{};
  static int acotar(int n) { return n < 0 ? 0 : (n > 100 ? 100 : n); }
  static void copiar(char* destino, const char* origen) {
    std::strncpy(destino, origen, 40); destino[40] = '\0';
  }
  bool repetida(const Peticion& p) {
    Marca* elegida = &marcas_[0];
    uint32_t mayorEdad = 0;
    for (auto& marca : marcas_) {
      if (marca.usada && !std::strcmp(marca.usuario, p.usuario)) {
        if (p.ms - marca.ms < rebote_) return true;
        marca.ms = p.ms; return false;
      }
      if (!marca.usada) elegida = &marca;
      else if (elegida->usada && p.ms - marca.ms >= mayorEdad) {
        mayorEdad = p.ms - marca.ms; elegida = &marca;
      }
    }
    copiar(elegida->usuario, p.usuario); elegida->ms = p.ms; elegida->usada = true;
    return false;
  }
};
