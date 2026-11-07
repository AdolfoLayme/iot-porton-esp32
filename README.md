# Portón IoT con ESP32

Este proyecto es un sistema IoT de control de acceso para portón inteligente basado en un microcontrolador ESP32, diseñado para demostrar una arquitectura completa de punta a punta que integra hardware físico y simulado (Wokwi), comunicación MQTT segura con cifrado TLS (flespi), control de concurrencia y reglas de seguridad física ejecutadas en el propio microcontrolador, una aplicación web progresiva (PWA) con control táctil y por voz, y autenticación estricta con gestión de llaves temporales a través de Supabase.

## Arquitectura del Sistema

```
  +------------------+           +-------------------+
  |  Celular (PWA)   | --login-> |   Supabase Auth   |
  |                  |           | (por invitación)  |
  |  - Control táctil|           +-------------------+
  |  - Control voz   |                     |
  |  - Escena 3D     | --pide llave MQTT-> | Edge Function
  |                  |                     | `llave-mqtt`
  |                  | <-token temporal----+
  +------------------+
          |
       MQTT/WSS (puerto 443)
          |
          v
  +--------------------------------------------------+
  |              flespi (Broker MQTT)                |
  |  - mqtt.flespi.io (MQTTS 8883 / WSS 443)         |
  |  - Temas ACL por usuario: porton/cmd/<user_id>   |
  |  - Temas del portón: estado, evento, online      |
  +--------------------------------------------------+
                          ^
                          | MQTTS (puerto 8883 con TLS)
                          v
               +----------------------+
               |    ESP32 DevKit      |
               | (Wokwi o Maqueta)    |
               | - Servo SG90         |
               | - Sensor HC-SR04     |
               | - LCD 1602 I2C       |
               | - Botones y LEDs     |
               +----------------------+
```

Flujo simplificado:
`celular → Supabase (llave) → flespi (MQTT) ↔ ESP32`

1. **Celular → Supabase:** El usuario inicia sesión y solicita una credencial temporal a la función `llave-mqtt`.
2. **Supabase (llave) → flespi:** La función genera en flespi un token MQTT con permisos ACL restringidos a su ID de usuario con caducidad obligatoria (TTL de 1 h).
3. **flespi (MQTT) ↔ ESP32:** El celular envía comandos al broker mediante WSS, y el ESP32 los recibe y publica su estado en tiempo real vía MQTTS sobre TLS 8883.

## Estructura de Carpetas

- **`wokwi/`**: Firmware del microcontrolador ESP32 (`sketch.ino`), lógica de reglas y concurrencia (`porton_reglas.h`), gestión de periféricos (`fisica.h`), comunicación FreeRTOS/MQTT (`red_firmware.h`), certificado TLS (`flespi_ca.h`), plantilla de configuración (`config.ejemplo.h`) y esquema de circuito (`diagram.json`).
- **`web/`**: Aplicación web PWA desarrollada con Vite y TypeScript. Incluye el panel de control móvil, comandos de voz en español, interfaz administrativa y visor 3D interactivo con Three.js (`demo.html` para maqueta y `casa.html` para simulación residencial).
- **`supabase/`**: Definiciones de base de datos con PostgreSQL/RLS (`migrations/`) y Edge Functions en Deno (`functions/`) para emisión de llaves ACL (`llave-mqtt`), administración de miembros (`miembros`), registro de historial (`registrar`) y procesamiento de voz (`voz`).
- **`pruebas/`**: Suite de pruebas unitarias en C++ para validar las reglas de concurrencia y seguridad del portón en el PC.
- **`herramientas/`**: Scripts auxiliares en Node.js para aprovisionamiento de tokens de dispositivo (`token-dispositivo.mjs`), pruebas de seguridad (`probar-seguridad.mjs`) y siembra de usuarios (`sembrar.mjs`).

## Ejecución del Proyecto

### Servidor de Desarrollo Web

Para iniciar el servidor local de desarrollo de la aplicación web:

```bash
pnpm -C web dev
```

### Pruebas

- **Pruebas unitarias de las reglas del portón (C++):**
  ```bash
  bash pruebas/correr.sh
  ```
- **Pruebas de calidad y tipado de la aplicación web:**
  ```bash
  pnpm -C web calidad
  ```

## Simulación en Wokwi

Puedes probar el circuito y el firmware en vivo directamente en tu navegador en el siguiente enlace:
- Simulación del Portón IoT en Wokwi: https://wokwi.com/projects/477415305503106049
