# Guía de estudio del Portón IoT: explica todo el proyecto para dominarlo ante el profesor.
# Uso: python armar_guia.py  →  Guia_Estudio_Porton_IoT.docx
import re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()
for s in doc.sections:
    s.top_margin = s.bottom_margin = Cm(2.2); s.left_margin = s.right_margin = Cm(2.3)
st = doc.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(11)
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
st.paragraph_format.space_after = Pt(5); st.paragraph_format.line_spacing = 1.15
for n, tam in ((1, 16), (2, 13), (3, 11.5)):
    h = doc.styles[f'Heading {n}']; h.font.name = 'Calibri'; h.font.size = Pt(tam)
    h.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F); h.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')


def texto(p, t):
    # **negrita** y `código`
    for parte in re.split(r'(\*\*.+?\*\*|`.+?`)', t):
        if not parte: continue
        if parte.startswith('**'): p.add_run(parte[2:-2]).bold = True
        elif parte.startswith('`'):
            r = p.add_run(parte[1:-1]); r.font.name = 'Consolas'; r.font.size = Pt(10)
        else: p.add_run(parte)
    return p


def P(t): return texto(doc.add_paragraph(), t)
def H(n, t): doc.add_heading(t, n)
def L(items, num=False):
    for it in items: texto(doc.add_paragraph(style='List Number' if num else 'List Bullet'), it)


def sombrear(celda, color):
    tc = celda._tc.get_or_add_tcPr(); s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), color); tc.append(s)


def T(enc, filas, anchos):
    t = doc.add_table(rows=1, cols=len(enc)); t.style = 'Table Grid'
    for i, e in enumerate(enc):
        c = t.rows[0].cells[i]; c.text = ''; r = c.paragraphs[0].add_run(e); r.bold = True; r.font.size = Pt(9.5)
        sombrear(c, 'DCE6F0')
    for f in filas:
        cs = t.add_row().cells
        for i, v in enumerate(f):
            cs[i].text = ''; p = cs[i].paragraphs[0]; texto(p, v)
            for r in p.runs: r.font.size = Pt(9.5)
    for fila in t.rows:
        for i, w in enumerate(anchos): fila.cells[i].width = Cm(w)
    doc.add_paragraph()


def C(codigo):
    for linea in codigo.strip('\n').split('\n'):
        p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.left_indent = Cm(0.5)
        r = p.add_run(linea or ' '); r.font.name = 'Consolas'; r.font.size = Pt(9)
    doc.add_paragraph()


def IMG(ruta, ancho, pie):
    doc.add_picture(ruta, width=Cm(ancho)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(pie); r.italic = True; r.font.size = Pt(9.5)


# ---------------- PORTADA ----------------
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before = Pt(120)
r = p.add_run('Guía de estudio'); r.font.size = Pt(28); r.bold = True; r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Portón IoT con ESP32 y MQTT'); r.font.size = Pt(18)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('Todo lo que hay que saber para explicar y defender el proyecto: metodología, circuito, '
          'componentes, código, nube, página web y términos.').italic = True
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before = Pt(60)
p.add_run('Internet de las Cosas (IoT) · Unidad I – Simulación virtual\n'
          'Universidad Nacional José María Arguedas · Andahuaylas, 2026')
doc.add_page_break()

# ---------------- 0. EN UNA PÁGINA ----------------
H(1, '1. El proyecto en una página')
P('**Qué es.** Un portón automático que se controla desde el celular, por voz o con botones físicos. '
  'El “cerebro” es un **ESP32**. Un **servomotor** mueve la hoja, un sensor **HC-SR04** detecta obstáculos, '
  'una pantalla **LCD** y dos **LEDs** muestran el estado. Todo está simulado en **Wokwi**.')
P('**Cómo se comunica.** El ESP32 y la app hablan por **MQTT** a través de un servidor en la nube (el **broker** '
  '**flespi**). Las cuentas de usuario y el historial viven en **Supabase**. La app es una página web instalable '
  '(**PWA**) publicada en **Vercel**. Una **casa 3D** muestra el portón en vivo.')
P('**Qué lo hace serio (lo que más vale defender):**')
L(['**Seguridad real:** solo los miembros autorizados pueden mandar órdenes; cada uno recibe una llave temporal de 1 hora '
   'que solo le permite escribir en su propio canal. Nadie puede hacerse pasar por otro ni por el portón.',
   '**Reglas decididas por el ESP32:** PARAR gana siempre; el sensor de obstáculo gana a cualquier “cerrar”; mientras el '
   'portón se mueve solo manda quien lo inició; los cambios de sentido tienen una pausa de 400 ms para proteger el motor.',
   '**Código sin bloqueos:** el ESP32 usa sus dos núcleos; la red corre en un núcleo y el control físico en el otro, '
   'así una red lenta nunca impide parar el portón.',
   '**Probado:** 7 pruebas de reglas en C++, 48 pruebas de la web y 12 pruebas de seguridad contra los servicios reales, '
   'más 12 casos de prueba con capturas.'])
P('**Las tres piezas que se muestran en la exposición:**')
T(['Pieza', 'Dónde', 'Para qué'], [
    ['Simulación del circuito', 'Wokwi: proyecto “Iot Porton Copy (2)”', 'Es el dispositivo: ESP32 + servo + sensor + LCD + botones + LEDs'],
    ['App de control', 'https://porton-iot.vercel.app', 'Entrar, abrir/cerrar/parar, apertura parcial, voz, historial, miembros'],
    ['Casa 3D', 'https://porton-iot.vercel.app/casa.html', 'Muestra el portón real en una casa; el carro puede quedarse bajo el portón como obstáculo'],
], [3.5, 5.5, 7.5])

# ---------------- METODOLOGÍA ----------------
H(1, '2. Metodología: cómo se hizo el proyecto')
P('Es lo que más le importa al profesor. Se trabajó por **fases**, cada una con un entregable verificable. '
  'La idea central: **primero entender y decidir, después construir, y probar cada pieza antes de juntarla**.')
H(2, '2.1. Fases')
T(['Fase', 'Qué se hizo', 'Entregable / evidencia'], [
    ['1. Análisis del problema', 'Se definió el problema del “portón ciego” (no informa su estado ni ve obstáculos). '
     'Se escribieron **metas**, **no-metas** (lo que no se hará: app de tienda, Alexa, varios portones) y **anti-metas** '
     '(lo que haría fracasar el proyecto aunque funcione: que alguien sin permiso abra el portón, que una clave maestra quede en la web).',
     'Documento de diseño `docs/superpowers/specs/2026-10-20-porton-iot-design.md`'],
    ['2. Investigación y selección de tecnologías', 'Se compararon brokers MQTT gratuitos leyendo su documentación oficial y '
     'probándolos con llamadas reales: EMQX Serverless (descartado: sin usuarios por API), HiveMQ Cloud Serverless '
     '(descartado: se retira el 31-12-2026) y **flespi** (elegido: llaves con permisos por canal y vencimiento).',
     'Tabla comparativa y pruebas en la nota técnica'],
    ['3. Diseño', 'Se dibujó la arquitectura (celular → nube → ESP32), se definió el **contrato de temas MQTT** '
     '(qué canal usa cada quien), las **reglas del portón** y el **mapa de pines** (tabla I/O).',
     'Diagrama de arquitectura, tabla de temas, tabla I/O'],
    ['4. Planificación', 'El diseño se partió en tareas pequeñas con su prueba cada una.',
     'Plan `docs/superpowers/plans/2026-10-20-porton-iot.md`'],
    ['5. Desarrollo guiado por pruebas (TDD)', 'Las reglas del portón se escribieron en C++ puro (`porton_reglas.h`) y se '
     'probaron **en la computadora con g++ antes de tocar el ESP32**. Primero se escribe la prueba, se ve fallar, luego el código.',
     '7/7 pruebas de reglas'],
    ['6. Implementación modular', 'Firmware separado en archivos con una sola responsabilidad (reglas, física, red, '
     'configuración). Web separada en módulos (red, estado, app, voz, casa).',
     'Repositorio git con historial de cambios'],
    ['7. Simulación y validación', 'El firmware se cargó en Wokwi, se probaron todos los casos (normal, obstáculo, dos '
     'usuarios, parar, sin permiso) mirando el Serial Monitor, el LCD, los LEDs y la app a la vez.',
     '12 casos de prueba con capturas (informe, sección 5.2)'],
    ['8. Pruebas de seguridad', 'Script que intenta “atacar” el sistema real: llave falsa, publicar en canal ajeno, '
     'hacerse pasar por el portón, usuario desactivado.', '12/12 pruebas de seguridad'],
    ['9. Despliegue', 'Base de datos y funciones en Supabase, broker flespi, web en Vercel.', 'Sistema en línea'],
    ['10. Iteración', 'Cada versión se probó en el celular real y se corrigió según lo observado (mensajes de error, '
     'actualización de la app instalada, obstáculo con el carro en la casa 3D).', 'Commits en git'],
    ['11. Documentación', 'Informe con el esquema del docente y normas APA 7, con todo el código.', 'Informe final (103 páginas)'],
], [3.3, 9, 4.2])
H(2, '2.2. Principios que se siguieron (y por qué)')
L(['**Una sola lógica para simulación y maqueta.** La simulación ES el sistema real: para pasar a la maqueta física solo se cambia '
   '`config.h` (WiFi, llave, ángulos). No se reescribe código.',
   '**El dispositivo es la fuente de verdad.** El ESP32 decide si una orden se acepta y publica el resultado; la app nunca '
   '“adivina” el estado, solo muestra lo que el ESP32 informa.',
   '**Sin bloqueos.** Nada de `delay()` largos: los tiempos se manejan comparando `millis()` (reloj interno en milisegundos).',
   '**Seguridad por diseño, no por esconder.** Aunque alguien lea todo el código de la web, no puede abrir el portón sin una llave válida.',
   '**Verificar con documentación oficial y datos reales**, no por suposición.',
   '**Control de versiones (git):** cada cambio queda registrado y se puede volver atrás.'])
H(2, '2.3. Herramientas usadas')
T(['Herramienta', 'Uso'], [
    ['Wokwi', 'Simulador en línea del ESP32 y sus componentes; compila el código y lo ejecuta en un ESP32 virtual'],
    ['Arduino (lenguaje C++) + arduino-cli', 'Escritura y compilación del firmware; arduino-cli comprobó el tamaño (81 % de flash, 15 % de RAM)'],
    ['g++', 'Compilar y correr las pruebas de las reglas en la computadora'],
    ['VS Code / terminal, git', 'Edición del código y control de versiones'],
    ['TypeScript + Vite + pnpm', 'Lenguaje, empaquetador y gestor de paquetes de la página web'],
    ['Vitest', 'Pruebas automáticas de la web (48)'],
    ['Three.js', 'Gráficos 3D de la casa en el navegador'],
    ['Supabase', 'Cuentas, base de datos PostgreSQL y funciones en la nube'],
    ['flespi', 'Broker MQTT en la nube'],
    ['Vercel', 'Publica la página web'],
    ['Gemini (Google)', 'Entiende las órdenes por voz'],
], [5, 11.5])

# ---------------- CIRCUITO ----------------
H(1, '3. El circuito')
IMG('ev/circuito.png', 15, 'Circuito en Wokwi: ESP32 DevKitC V4, servo, HC-SR04, LCD 16×2 I2C, 3 pulsadores y 2 LEDs con resistencias.')
H(2, '3.1. Tabla de pines (I/O)')
T(['Pin ESP32', 'Variable en código', 'Señal', 'Componente', 'Tipo'], [
    ['GPIO 18', '`PIN_SERVO`', 'PWM', 'Servomotor (cable naranja de señal)', 'Salida'],
    ['GPIO 5', '`PIN_TRIG`', 'Digital (pulso 10 µs)', 'HC-SR04, disparo', 'Salida'],
    ['GPIO 19', '`PIN_ECHO`', 'Digital (ancho de pulso)', 'HC-SR04, eco', 'Entrada'],
    ['GPIO 21', 'SDA (`lcd`)', 'I2C datos', 'LCD 16×2', 'Comunicación'],
    ['GPIO 22', 'SCL (`lcd`)', 'I2C reloj', 'LCD 16×2', 'Comunicación'],
    ['GPIO 32', '`PIN_BTN_ABRIR`', 'Digital, pull-up interno', 'Pulsador verde ABRIR', 'Entrada'],
    ['GPIO 33', '`PIN_BTN_CERRAR`', 'Digital, pull-up interno', 'Pulsador rojo CERRAR', 'Entrada'],
    ['GPIO 25', '`PIN_BTN_PARAR`', 'Digital, pull-up interno', 'Pulsador amarillo PARAR', 'Entrada'],
    ['GPIO 27', '`PIN_LED_VERDE`', 'Digital', 'LED verde (abierto) + 220 Ω', 'Salida'],
    ['GPIO 26', '`PIN_LED_ROJO`', 'Digital', 'LED rojo (movimiento/obstáculo) + 220 Ω', 'Salida'],
    ['5V', '—', 'Alimentación', 'Servo, HC-SR04, LCD', 'Energía'],
    ['GND', '—', 'Tierra común', 'Todos los componentes', 'Energía'],
    ['Antena WiFi interna', '`WiFi`, `cliente`', '802.11 b/g/n 2,4 GHz', 'Conexión a internet / MQTT', 'Comunicación'],
], [2.3, 3.4, 3.4, 5, 2.4])
H(2, '3.2. ¿Por qué esos pines y no otros?')
P('El ESP32 tiene 34 GPIO, pero **no todos sirven para todo**. Se eligieron evitando los pines problemáticos:')
T(['Pines a evitar', 'Motivo'], [
    ['GPIO 6 a 11', 'Están conectados a la memoria flash interna; usarlos cuelga el ESP32.'],
    ['GPIO 0, 2, 12, 15 (y 5)', 'Son pines de **arranque (strapping)**: su nivel al encender decide cómo arranca el chip.'],
    ['GPIO 34 a 39', 'Solo pueden ser **entradas** y **no tienen resistencia pull-up interna**.'],
    ['GPIO 1 y 3', 'Son TX/RX del puerto serie (Serial Monitor).'],
], [5, 11.5])
L(['**Servo en GPIO 18:** cualquier pin de salida puede generar PWM con el periférico LEDC del ESP32; el 18 está libre, '
   'no es de arranque y queda al lado del 19 (eco), lo que ordena el cableado.',
   '**Botones en 32, 33 y 25:** tienen **pull-up interno**, así el botón se conecta directo entre el pin y GND sin resistencia externa. '
   'No son pines de arranque. El 25 pertenece al ADC2, que choca con el WiFi solo en lecturas **analógicas**; como se usa en '
   'modo digital, no hay problema.',
   '**LEDs en 27 y 26:** salidas digitales comunes, sin funciones especiales al arrancar.',
   '**LCD en 21 (SDA) y 22 (SCL):** son los pines I2C **por defecto** de la librería `Wire` en el ESP32; no hace falta configurarlos.',
   '**HC-SR04 en 5 (TRIG) y 19 (ECHO):** el 19 es entrada común. El 5 es pin de arranque, pero funciona porque la entrada TRIG '
   'del sensor no fuerza ningún nivel al encender (es de alta impedancia).'])
H(2, '3.3. Conexiones y alimentación')
L(['**Tierra común (GND):** todos los componentes comparten GND con el ESP32. Sin tierra común las señales no tienen referencia y '
   'no funcionan (por eso se agregó el cable GND del HC-SR04 que faltaba).',
   '**Botones:** un lado al pin, otro a GND. En reposo el pull-up deja el pin en ALTO (1); al presionar, pasa a BAJO (0). '
   'Por eso el código pregunta `digitalRead(pin) == LOW`.',
   '**LEDs:** pin → ánodo (pata larga) → LED → cátodo → resistencia de 220 Ω → GND. La resistencia limita la corriente: '
   '(3,3 V − 2,0 V) / 220 Ω ≈ **6 mA**, seguro para el LED y para el pin (el ESP32 aguanta unos 20 mA por pin de forma segura).',
   '**Servo, sensor y LCD a 5 V:** trabajan a 5 V; el pin 5V de la placa viene directo del USB.'])
P('**Para la maqueta física (Unidad II) hay dos cuidados que la simulación no muestra:**')
L(['El pin ECHO del HC-SR04 entrega **5 V**, y el ESP32 trabaja a **3,3 V** (no tolera 5 V). Hay que bajar la señal con un '
   '**divisor de tensión** (por ejemplo 1 kΩ y 2 kΩ) o un conversor de nivel.',
   'El servo puede consumir hasta ~650 mA cuando se traba. Conviene alimentarlo con una **fuente de 5 V aparte**, uniendo su GND con el del ESP32.'])

# ---------------- COMPONENTES ----------------
H(1, '4. Los componentes')
H(2, '4.1. ESP32 DevKitC V4 (el controlador)')
T(['Dato', 'Valor'], [
    ['Fabricante', 'Espressif Systems (China)'],
    ['Placa / módulo', 'ESP32-DevKitC V4 con módulo ESP32-WROOM-32'],
    ['Procesador', 'Xtensa LX6 de **doble núcleo**, 32 bits, hasta **240 MHz**'],
    ['Memoria', '520 KB de SRAM; 4 MB de flash (en el módulo)'],
    ['Conectividad', 'WiFi 802.11 b/g/n (2,4 GHz) y Bluetooth 4.2 (clásico y BLE)'],
    ['Entradas/salidas', '34 GPIO, 18 canales ADC de 12 bits, 2 DAC, 16 canales PWM (LEDC), I2C, SPI, UART'],
    ['Voltaje lógico', '**3,3 V** (se alimenta por USB a 5 V; un regulador baja a 3,3 V)'],
    ['Sistema interno', 'FreeRTOS (permite tareas en paralelo)'],
    ['Datasheet', 'espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf'],
], [4, 12.5])
P('**¿Por qué ESP32 y no Arduino UNO ni Raspberry Pi?** El Arduino UNO (ATmega328P, 16 MHz, 2 KB de RAM) **no tiene WiFi** y su '
  'memoria no alcanza para conexiones cifradas (TLS). La Raspberry Pi es una computadora con Linux: más cara, gasta más y tarda en '
  'arrancar; es demasiado para un portón. El ESP32 trae WiFi, dos núcleos, memoria suficiente para TLS y cuesta poco.')
H(2, '4.2. Servomotor (tipo SG90)')
P('**Qué es:** un motor pequeño con engranajes, un potenciómetro y un circuito de control dentro. No gira libre: va al **ángulo** que se le pide y se queda ahí.')
P('**Cómo funciona:** recibe una señal **PWM** de 50 Hz (un pulso cada 20 ms). El **ancho del pulso** indica el ángulo. '
  'El circuito interno compara el ángulo pedido con el que lee el potenciómetro y mueve el motor hasta igualarlos (control en lazo cerrado).')
T(['Dato', 'Valor'], [
    ['Fabricante de referencia', 'TowerPro SG90 (Wokwi simula un servo genérico de este tipo)'],
    ['Alimentación', '4,8 a 6 V'],
    ['Torque', '~1,8 kg·cm a 4,8 V'],
    ['Velocidad', '~0,1 s por cada 60°'],
    ['Señal', 'PWM 50 Hz; en el código: **500 µs = 0°** y **2400 µs = 180°** (`servo.attach(PIN_SERVO, 500, 2400)`)'],
    ['Cables', 'Marrón = GND, rojo = 5 V, naranja = señal'],
    ['En el proyecto', '0° = cerrado, 90° = abierto; avanza 1° cada 15 ms → abre en ~1,35 s, suave'],
], [4, 12.5])
H(2, '4.3. Sensor ultrasónico HC-SR04')
P('**Principio físico:** emite un sonido de **40 kHz** (ultrasonido, no audible), el sonido rebota en el objeto y vuelve. '
  'Midiendo el tiempo de ida y vuelta se calcula la distancia, porque se conoce la velocidad del sonido (343 m/s).')
P('**Paso a paso:** (1) el ESP32 pone TRIG en alto 10 µs; (2) el sensor emite 8 pulsos de ultrasonido; (3) el pin ECHO queda en '
  'alto mientras el sonido viaja; (4) el ESP32 mide cuánto duró ese alto con `pulseIn()`.')
P('**La fórmula del código `us / 58`:** el sonido tarda 29,1 µs en recorrer 1 cm. Como va y vuelve, son 58,2 µs por cada '
  'centímetro de distancia. Por eso distancia (cm) = tiempo (µs) / 58.')
T(['Dato', 'Valor'], [
    ['Alimentación', '5 V, ~15 mA'], ['Rango', '2 cm a 4 m'], ['Ángulo de detección', '~15°'],
    ['Resolución', '~3 mm'], ['Frecuencia', '40 kHz'],
    ['En el proyecto', 'Se mide cada 100 ms. Si no vuelve eco en 25 ms se toma 400 cm (nada delante). '
     'Menos de **20 cm** = obstáculo'],
    ['Datasheet', 'cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf'],
], [4, 12.5])
H(2, '4.4. Pantalla LCD 16×2 con módulo I2C')
P('Muestra 2 filas de 16 caracteres. El controlador de la pantalla es el **HD44780** (Hitachi). Normalmente necesita 6 a 10 cables; '
  'el módulo **PCF8574** (pegado atrás) la convierte a **I2C**, y solo usa 2 cables de datos (SDA y SCL). '
  'Su **dirección I2C es 0x27** (`LiquidCrystal_I2C lcd(0x27, 16, 2)`).')
P('En el proyecto muestra, por ejemplo: `abriendo  45%` en la fila 1 y `Dist:  18 cm` en la fila 2.')
H(2, '4.5. Pulsadores y LEDs')
L(['**Pulsadores:** interruptores que conectan sus patas mientras se presionan. Tres: ABRIR (verde), CERRAR (rojo), PARAR (amarillo). '
   'En el código el botón físico es el usuario “local” y cumple las mismas reglas que la app.',
   '**LED verde:** encendido = portón totalmente abierto y quieto.',
   '**LED rojo:** parpadea (cada 250 ms) mientras el portón se mueve; fijo si hay un obstáculo.',
   '**Resistencias de 220 Ω:** limitan la corriente de cada LED (ver 3.3).'])

# ---------------- FIRMWARE ----------------
H(1, '5. El código del ESP32 (firmware)')
P('Está escrito en **C++ con el entorno Arduino** y dividido en archivos, cada uno con una sola responsabilidad:')
T(['Archivo', 'Qué hace'], [
    ['`sketch.ino`', 'Programa principal: `setup()`, `loop()`, procesa las órdenes que llegan, publica el estado y escribe el LCD'],
    ['`porton_reglas.h`', 'Las **reglas** del portón (quién puede mandar, obstáculo, antirrebote, pausa). C++ puro, sin Arduino, para poder probarlo en la PC'],
    ['`fisica.h`', 'Todo lo físico: pines, servo, sensor, botones, LEDs, LCD'],
    ['`red_firmware.h`', 'WiFi y MQTT en una **tarea aparte** del núcleo 0'],
    ['`config.h`', 'Valores que cambian entre simulación y maqueta: WiFi, llave MQTT (privada), ángulos, umbral'],
    ['`flespi_ca.h`', 'Certificado público de GlobalSign para verificar que el broker es el verdadero (TLS)'],
    ['`diagram.json`', 'El circuito de Wokwi (componentes y cables)'],
], [3.8, 12.7])
H(2, '5.1. Librerías')
T(['Librería', 'Para qué'], [
    ['ESP32Servo', 'Generar la señal PWM del servo con el periférico LEDC del ESP32'],
    ['LiquidCrystal I2C', 'Escribir en el LCD por I2C'],
    ['PubSubClient', 'Cliente MQTT (conectarse, suscribirse, publicar)'],
    ['ArduinoJson', 'Armar y leer mensajes en formato JSON'],
    ['WiFi, WiFiClientSecure', 'Conexión WiFi y conexión cifrada TLS (vienen con el ESP32)'],
], [4, 12.5])
H(2, '5.2. Variables importantes')
T(['Variable', 'Tipo', 'Significado'], [
    ['`angulo`', 'int', 'Ángulo actual del servo (0–90°)'],
    ['`objetivo`', 'int', 'Ángulo al que debe llegar'],
    ['`distancia`', 'float', 'Última distancia medida en cm'],
    ['`obstaculo`', 'bool', 'true si `distancia < DIST_OBSTACULO_CM` (20 cm)'],
    ['`verde`, `rojo`', 'bool', 'Estado de cada LED'],
    ['`cambio`', 'bool', 'Hay algo nuevo que publicar'],
    ['`tPaso`, `tSensor`, `tPublica`, `tPausa`', 'uint32_t', 'Marcas de tiempo (`millis()`) de la última vez que se hizo cada cosa'],
    ['`pausaMs`', 'uint32_t', 'Cuánto esperar antes de invertir el sentido (400 ms)'],
    ['`reglas`', 'Reglas', 'Objeto que decide si se acepta cada orden'],
    ['`miembros`', 'JsonDocument', 'Lista id → nombre de los usuarios, para mostrar quién manda'],
    ['`distanciaEntorno`, `tEntorno`', 'float, uint32_t', 'Distancia que avisa la casa 3D cuando el carro corta el haz, y cuándo llegó'],
    ['`entradaRed`, `salidaRed`', 'QueueHandle_t', 'Colas para pasar mensajes entre la tarea de red y el `loop()`'],
], [5.2, 2.6, 8.7])
H(2, '5.3. Constantes de configuración')
T(['Constante', 'Valor', 'Por qué'], [
    ['`ANGULO_CERRADO` / `ANGULO_ABIERTO`', '0° / 90°', 'Un cuarto de vuelta basta para la hoja de la maqueta'],
    ['`PASO_MS`', '15 ms', 'Mover 1° cada 15 ms da un movimiento suave (~1,35 s para abrir)'],
    ['`DIST_OBSTACULO_CM`', '20 cm', 'Distancia adecuada a la escala de la maqueta'],
    ['`PAUSA_INVERSION_MS`', '400 ms', 'Frenar antes de cambiar de sentido protege los engranajes del servo'],
    ['Antirrebote por usuario', '300 ms', 'Ignora la misma orden repetida muy rápido (doble toque)'],
    ['`MODO_SEGURO`', '1', 'Usa TLS y llave (flespi). Con 0 usa un broker público de prueba'],
], [5.2, 2.6, 8.7])
H(2, '5.4. Funciones y cómo trabajan')
T(['Función', 'Archivo', 'Qué hace'], [
    ['`setup()`', 'sketch.ino', 'Se ejecuta una vez: inicia el Serial a 115200 baudios, la parte física y la red'],
    ['`loop()`', 'sketch.ino', 'Se repite sin parar (ver 5.5)'],
    ['`iniciarFisica()`', 'fisica.h', 'Configura pines (entradas con pull-up, salidas), conecta el servo y enciende el LCD'],
    ['`medirDistancia()`', 'fisica.h', 'Dispara el HC-SR04 y devuelve cm (`us / 58`)'],
    ['`apretado(pin, antes)`', 'fisica.h', 'Detecta el **flanco**: devuelve true solo en el instante en que se presiona, no mientras se mantiene'],
    ['`porcentaje(grados)`', 'fisica.h', 'Convierte ángulo a % de apertura (0° = 0 %, 90° = 100 %)'],
    ['`estadoActual()`', 'fisica.h', 'Devuelve el texto: abriendo, cerrando, abierto, cerrado, detenido o pausa'],
    ['`iniciarRed()`', 'red_firmware.h', 'Crea las dos colas y lanza `tareaRed` en el núcleo 0'],
    ['`tareaRed()`', 'red_firmware.h', 'Bucle infinito: conecta WiFi, espera la hora (NTP), conecta a flespi con TLS, se suscribe y reintenta cada 3 s si se cae'],
    ['`recibirRed()`', 'red_firmware.h', 'Cuando llega un mensaje MQTT lo pone en la cola de entrada'],
    ['`emitir()`', 'red_firmware.h', 'Pone un mensaje en la cola de salida para que la tarea de red lo publique'],
    ['`procesarRed()`', 'sketch.ino', 'Saca hasta 8 mensajes de la cola: órdenes, lista de miembros, distancia de la casa 3D, ping'],
    ['`solicitar()`', 'sketch.ino', 'Pide a `reglas.decidir()` si la orden se acepta; si sí, fija el nuevo objetivo'],
    ['`evento()`', 'sketch.ino', 'Publica el resultado de cada orden (aceptada, ocupado, bloqueada, ignorada) y lo imprime en el Serial'],
    ['`publicarEstado()`', 'sketch.ino', 'Publica el estado en JSON (retenido) y actualiza el LCD'],
    ['`Reglas::decidir()`', 'porton_reglas.h', 'El corazón de la lógica (ver 5.6)'],
], [3.8, 3, 9.7])
H(2, '5.5. El bucle principal sin bloqueos')
P('En cada vuelta del `loop()` (miles por segundo) se revisa **qué toca hacer según el tiempo**, comparando `millis()`; nunca se queda esperando:')
C('''procesarRed();                         // órdenes que llegaron por MQTT
botones: si se presionó → solicitar("local", ...)
cada 100 ms  → medir distancia; si hay obstáculo y está cerrando → reabrir
cada 15 ms   → mover el servo 1° hacia el objetivo
LEDs         → verde si abierto; rojo parpadea al moverse, fijo con obstáculo
cada 150 ms (moviéndose) o 1000 ms (quieto) → publicarEstado()''')
P('**Por qué es importante:** con `delay()`, mientras el programa “duerme” no lee botones ni el sensor. Con `millis()` todo se '
  'atiende casi al mismo tiempo. Además, toda la red (que puede tardar segundos) corre en **otro núcleo**: el botón PARAR '
  'responde aunque internet esté lento.')
P('**Detalle honesto:** `pulseIn()` del sensor puede esperar hasta 25 ms si no hay eco; es un bloqueo corto y acotado que no afecta la respuesta del portón.')
H(2, '5.6. Las reglas (porton_reglas.h)')
P('`decidir()` recibe la orden (quién, qué, cuándo), la posición, el objetivo y si hay obstáculo, y aplica en este orden:')
L(['**PARAR** → se acepta siempre y libera el turno.',
   '**Obstáculo** → si el destino cierra más el portón, se rechaza: “bloqueado por obstáculo”.',
   '**Antirrebote** → si el mismo usuario mandó otra orden hace menos de 300 ms: “orden repetida”.',
   '**Turno** → si el portón se mueve por orden de otra persona: “ocupado”.',
   '**Inversión** → si cambia de sentido, espera 400 ms antes de moverse.',
   'Si pasa todo: “aceptada” y esa persona toma el turno hasta que el portón se detenga.'], num=True)
P('Además, en el `loop()`: si el portón está **cerrando** y aparece un obstáculo, el usuario “sensor” manda **abrir** automáticamente.')
H(2, '5.7. Cómo se compila y se carga')
P('En Wokwi, al presionar ▶ el código se envía a su servidor de compilación (usa el compilador de Arduino para ESP32), que genera el '
  '**binario (.bin)** y lo carga en el ESP32 virtual, igual que se grabaría en una placa real por USB. Localmente se compiló con '
  '**arduino-cli** (placa `esp32:esp32:esp32`) para comprobar que entra: **81 % de la flash** y **15 % de la RAM**.')

# ---------------- COMUNICACIÓN ----------------
H(1, '6. Comunicación: MQTT y la nube')
IMG('diag/arquitectura.png', 16, 'Arquitectura: celular, casa 3D, nube (Supabase + flespi) y ESP32.')
H(2, '6.1. Cómo funciona MQTT')
P('MQTT es un protocolo de mensajes ligero, hecho para IoT. Funciona con el modelo **publicar/suscribir**: nadie se habla directo; '
  'todos se conectan a un servidor central (**broker**). Quien quiere enviar algo **publica** en un **tema** (como un canal: '
  '`porton/estado`), y el broker se lo entrega a todos los que están **suscritos** a ese tema.')
H(2, '6.2. Temas usados')
T(['Tema', 'Quién escribe', 'Quién lee', 'Contenido'], [
    ['`porton/cmd/<id>`', 'Cada usuario (solo el suyo)', 'ESP32 (`cmd/+`)', '`abrir`, `cerrar`, `parar`, `pos:0-100`, `ping:…`'],
    ['`porton/estado`', 'Solo el ESP32 (retenido)', 'App y casa 3D', 'JSON: posición, objetivo, estado, distancia, obstáculo, turno, LEDs'],
    ['`porton/evento`', 'Solo el ESP32', 'App (+ webhook → historial)', 'JSON: usuario, orden, resultado, motivo'],
    ['`porton/online`', 'Solo el ESP32 (retenido, LWT)', 'App', '`1` conectado, `0` desconectado'],
    ['`porton/pong/<id>`', 'ESP32', 'Ese usuario', 'Respuesta al ping, para medir la latencia'],
    ['`porton/miembros`', 'Función `miembros`', 'ESP32', 'Lista id → nombre'],
    ['`porton/entorno`', 'Casa 3D', 'ESP32', 'Distancia en cm del carro que corta el haz'],
], [3.5, 3.8, 3.4, 5.8])
H(2, '6.3. Seguridad: la parte más fuerte del proyecto')
L(['**Cifrado TLS:** el ESP32 se conecta por el puerto **8883** (MQTTS) y el navegador por **443** (WSS). Nadie en la red puede leer ni cambiar los mensajes. '
   'El ESP32 verifica el certificado del broker; para eso primero consulta la hora real por **NTP** (sin hora correcta no puede validar el certificado).',
   '**Llaves temporales:** al entrar, la app pide una llave a la función `llave-mqtt`. La función verifica que la persona sea miembro activo y crea en flespi una llave que **vence en 1 hora** y solo permite publicar en `porton/cmd/<su_id>`. La app la renueva antes de que venza.',
   '**Identidad que no se puede falsificar:** el ESP32 sabe quién manda por el **tema** donde llegó la orden, no por lo que dice el mensaje. Como cada llave solo deja escribir en su propio tema, nadie puede hacerse pasar por otro.',
   '**Solo el ESP32 publica el estado:** ningún usuario puede escribir en `estado`, `evento` u `online`.',
   '**Quitar a alguien:** el administrador lo desactiva; ya no recibe llaves y sus llaves vigentes se borran al instante.',
   '**Sin claves maestras en la web:** las claves maestras (flespi, Supabase service role, Gemini) solo existen en el servidor.',
   '**Sin registro público:** las cuentas las crea el administrador.',
   '**RLS en la base de datos:** cada fila se protege con reglas: un miembro solo lee su fila y el historial; el admin ve a todos.'])
H(2, '6.4. Supabase (la base de datos y las funciones)')
T(['Parte', 'Qué hace'], [
    ['Auth', 'Inicio de sesión con correo y contraseña; entrega un JWT'],
    ['Tabla `miembros`', '`user_id`, `nombre`, `rol` (admin/miembro), `activo`'],
    ['Tabla `historial`', '`ts`, `user_id`, `orden`, `resultado`, `motivo`'],
    ['Función `llave-mqtt`', 'Da la llave MQTT de 1 hora'],
    ['Función `miembros`', 'El admin agrega, activa/desactiva o cambia el rol; publica la lista al ESP32'],
    ['Función `registrar`', 'Recibe cada evento (por webhook de flespi con un secreto) y lo guarda en el historial'],
    ['Función `voz`', 'Manda la frase o el audio a Gemini, que devuelve la orden; el servidor valida el rango antes de aceptarla'],
], [4, 12.5])

# ---------------- WEB ----------------
H(1, '7. La página web (app de control y casa 3D)')
H(2, '7.1. Cómo se construyó')
L(['**Lenguaje:** TypeScript (JavaScript con tipos, detecta errores antes de ejecutar).',
   '**Empaquetador:** Vite, que junta el código y lo optimiza. **Gestor de paquetes:** pnpm.',
   '**Librerías:** `mqtt` (MQTT por WebSocket), `@supabase/supabase-js` (cuentas y datos), `three` (3D), `gsap` y `animejs` (animaciones).',
   '**PWA:** tiene un manifiesto y un **service worker**, así se instala en el celular como app. El service worker pide primero la versión nueva a la red y usa la copia guardada solo sin internet; así las actualizaciones llegan a la app instalada. Nunca guarda llaves ni estados.',
   '**Publicación:** se compila (`pnpm build`) y se sube a **Vercel**.',
   '**Pruebas:** 48 pruebas automáticas con Vitest (lectura del estado, interpretación de voz, renovación de llaves, etc.).'])
H(2, '7.2. Módulos')
T(['Módulo', 'Qué hace'], [
    ['`red/conexion.ts`', 'Conexión MQTT: suscribirse, mandar órdenes (valida que sean válidas), medir latencia con ping cada 2 s, detectar si el portón se desconecta (7 s sin respuesta)'],
    ['`red/sesion.ts`', 'Entrar/salir con Supabase, pedir la llave, leer historial, gestionar miembros, voz'],
    ['`red/modos.ts`', 'Credencial del visor de la casa 3D (solo lectura + entorno)'],
    ['`estado/porton.ts`', 'Valida el JSON que llega del ESP32 (si viene mal, se ignora) y lo traduce a texto para la pantalla'],
    ['`app/inicio.ts`', 'Pantalla principal: botones, deslizador, mensajes, historial'],
    ['`app/admin.ts`', 'Pantalla de miembros (solo admin)'],
    ['`app/pwa.ts`', 'Registro del service worker y actualización'],
    ['`voz/microfono.ts`', 'Graba la voz (MediaRecorder) y la manda a la función `voz`; la orden se envía sola'],
    ['`voz/interpretar.ts`', 'Respaldo local: entiende “abre”, “cierra”, “para”, “a la mitad”, porcentajes'],
    ['`casa/*.ts`', 'Casa 3D: escena, portón, carro, sensor, clima, vegetación'],
], [3.8, 12.7])
H(2, '7.3. La casa 3D y el carro como obstáculo')
P('La casa se conecta sola con una llave de **solo lectura** (no puede mandar órdenes). Refleja la posición real del portón. '
  'Si el carro se detiene bajo el portón y corta el haz del sensor, la casa publica la distancia en `porton/entorno` cada 400 ms. '
  'El ESP32 la combina con su HC-SR04 (toma la menor) durante 2,5 s: detecta el obstáculo, rechaza “cerrar” y la app avisa '
  '“no se puede cerrar, hay un obstáculo en el paso del portón”.')
H(2, '7.4. Valores importantes de la web')
T(['Valor', 'Cantidad'], [
    ['Duración de la llave MQTT', '1 hora (se renueva antes)'],
    ['Ping para latencia', 'cada 2 s'], ['Portón “sin conexión” si no responde', '7 s'],
    ['Casa 3D: en línea mientras llegan estados', '4 s'], ['Aviso de entorno de la casa', 'cada 400 ms, válido 2,5 s'],
    ['Reintento de conexión', '2 s (web), 3 s (ESP32)'],
    ['Puertos', 'WSS 443 (web), MQTTS 8883 (ESP32)'],
], [8, 8.5])

# ---------------- PRUEBAS ----------------
H(1, '8. Pruebas y resultados')
T(['Tipo de prueba', 'Cómo', 'Resultado'], [
    ['Reglas del portón', '`bash pruebas/correr.sh` (g++ en la PC)', '7/7'],
    ['Web', '`pnpm calidad` (TypeScript + Vitest)', '48/48'],
    ['Seguridad', '`node herramientas/probar-seguridad.mjs` contra flespi y Supabase reales', '12/12'],
    ['Casos funcionales', 'Protocolo de 12 casos en Wokwi + app + casa 3D, con capturas', 'Todos correctos'],
], [4, 8.5, 4])
P('Casos más representativos: abrir/cerrar normal, apertura parcial, obstáculo al cerrar (reabre), cerrar con obstáculo (bloqueado), '
  'carro detenido en el portón, dos usuarios a la vez (“ocupado”), PARAR de otro usuario (gana), contraseña incorrecta, usuario sin permisos.')

# ---------------- PREGUNTAS ----------------
H(1, '9. Preguntas que puede hacer el profesor')
for preg, resp in [
    ('¿Qué pasa si dos personas mandan órdenes a la vez?', 'Gana quien empezó el movimiento; la otra recibe “ocupado”. Solo PARAR la puede interrumpir.'),
    ('¿Qué pasa si se cae internet?', 'El portón sigue funcionando con los botones y el sensor, porque las reglas están en el ESP32. Al volver la red publica su estado real. Las órdenes viejas no se ejecutan después.'),
    ('¿Cómo sabe el sistema que el portón se desconectó?', 'Por el LWT: al conectarse, el ESP32 deja dicho al broker “si me caigo, publica 0 en porton/online”. Además, la app hace ping cada 2 s.'),
    ('¿Puede alguien que lea el código de la web abrir el portón?', 'No. Sin una llave válida de flespi no puede ni conectarse, y la llave solo se entrega a miembros activos.'),
    ('¿Por qué no usar delay()?', 'Porque congela el programa: mientras espera no lee botones ni el sensor. Con millis() todo se atiende a tiempo.'),
    ('¿Para qué sirven los dos núcleos?', 'Núcleo 0: red (WiFi, TLS, MQTT). Núcleo 1: control físico. Se comunican por colas de FreeRTOS. Una red lenta no impide parar.'),
    ('¿Por qué la pausa de 400 ms al invertir?', 'Cambiar de sentido de golpe fuerza los engranajes del servo; frenar primero lo protege.'),
    ('¿Qué es QoS 0 y por qué se usa?', 'Entrega “como máximo una vez”, sin reintentos. Para un portón es mejor perder una orden que ejecutarla tarde.'),
    ('¿Por qué el estado es retenido?', 'El broker guarda el último estado; quien se conecta lo recibe al instante sin esperar.'),
    ('¿Cómo se calcula la distancia?', 'Tiempo del eco en µs dividido entre 58 (ida y vuelta a 343 m/s).'),
    ('¿Qué cambia para la maqueta física?', 'Solo config.h (WiFi, llave, ángulos), un divisor de tensión en ECHO y una fuente aparte para el servo.'),
]:
    texto(doc.add_paragraph(), f'**{preg}** {resp}')

# ---------------- GLOSARIO ----------------
H(1, '10. Glosario de términos')
T(['Término', 'Significado'], [
    ['IoT (Internet de las Cosas)', 'Objetos físicos conectados a internet que envían datos y reciben órdenes'],
    ['Microcontrolador', 'Chip pequeño con procesador, memoria y pines, que ejecuta un solo programa (el ESP32)'],
    ['Firmware', 'El programa que corre dentro del microcontrolador'],
    ['Datasheet', 'Hoja de datos del fabricante con las características técnicas de un componente'],
    ['GPIO', 'Pin de entrada/salida de propósito general: se programa para leer o escribir'],
    ['Digital / analógico', 'Digital: solo dos valores (0 o 1). Analógico: valores continuos (ej. 0–3,3 V)'],
    ['PWM', 'Modulación por ancho de pulso: una señal que se prende y apaga rápido; el ancho del pulso transmite información (en el servo, el ángulo)'],
    ['LEDC', 'Periférico del ESP32 que genera señales PWM'],
    ['ADC', 'Convertidor analógico-digital: convierte un voltaje en un número'],
    ['Pull-up', 'Resistencia que mantiene un pin en ALTO cuando nada lo conecta; el ESP32 la trae dentro'],
    ['Flanco', 'El instante en que una señal cambia (de 1 a 0 o de 0 a 1)'],
    ['Rebote / antirrebote', 'Rebote: un botón físico vibra y genera varios pulsos. Antirrebote: técnica para contar solo uno'],
    ['Pin de arranque (strapping)', 'Pin cuyo nivel al encender decide cómo arranca el chip'],
    ['I2C', 'Bus de comunicación de 2 cables (SDA datos, SCL reloj); cada dispositivo tiene una dirección (LCD = 0x27)'],
    ['UART / Serial', 'Comunicación serie por TX/RX; el Serial Monitor muestra lo que imprime el ESP32 (115200 baudios)'],
    ['Baudio', 'Símbolos por segundo en una comunicación serie'],
    ['Divisor de tensión', 'Dos resistencias que bajan un voltaje (ej. de 5 V a 3,3 V)'],
    ['Tierra común (GND)', 'Referencia de 0 V que comparten todos los componentes'],
    ['millis()', 'Función que devuelve los milisegundos desde que arrancó el ESP32; base del control sin bloqueos'],
    ['Bloqueante', 'Código que detiene todo mientras espera (ej. delay())'],
    ['FreeRTOS', 'Sistema operativo de tiempo real del ESP32; permite tareas en paralelo'],
    ['Tarea / núcleo', 'Tarea: un programa que corre en paralelo. Núcleo: cada procesador del ESP32 (tiene 2)'],
    ['Cola (queue)', 'Fila segura para pasar mensajes entre tareas'],
    ['JSON', 'Formato de texto para datos: {"pos": 45, "obstaculo": false}'],
    ['WiFi 802.11 b/g/n', 'Estándar de red inalámbrica a 2,4 GHz'],
    ['MQTT', 'Protocolo de mensajes ligero para IoT, basado en publicar/suscribir'],
    ['Broker', 'Servidor central de MQTT que reparte los mensajes (flespi)'],
    ['Tema (topic)', 'Nombre del canal donde se publica un mensaje (porton/estado)'],
    ['Comodín +', 'En una suscripción, reemplaza un nivel del tema: cmd/+ recibe cmd/de cualquier usuario'],
    ['Publicar / suscribir', 'Enviar un mensaje a un tema / pedir recibir los mensajes de un tema'],
    ['QoS', 'Calidad de servicio de MQTT (0, 1, 2): cuántas garantías de entrega'],
    ['Mensaje retenido', 'El broker guarda el último mensaje del tema y lo entrega a quien se conecte después'],
    ['LWT (última voluntad)', 'Mensaje que el broker publica solo si el dispositivo se desconecta sin avisar'],
    ['Keep alive', 'Señal periódica para que el broker sepa que el cliente sigue vivo (10 s)'],
    ['Latencia', 'Tiempo que tarda un mensaje en ir y volver'],
    ['Ping / pong', 'Mensaje de prueba y su respuesta, para medir la latencia'],
    ['TLS', 'Cifrado de la conexión (el “candado” de https)'],
    ['Certificado / CA raíz', 'Documento digital que prueba la identidad del servidor; la CA raíz (GlobalSign) es la autoridad que lo firma'],
    ['NTP', 'Protocolo para obtener la hora exacta por internet'],
    ['MQTTS / WSS', 'MQTT cifrado por TCP (puerto 8883) / MQTT cifrado sobre WebSocket (puerto 443, el del navegador)'],
    ['WebSocket', 'Conexión permanente de dos vías entre el navegador y un servidor'],
    ['Token / llave', 'Texto secreto que identifica a un cliente y da permisos'],
    ['ACL', 'Lista de control de acceso: qué temas puede leer o escribir cada llave'],
    ['TTL', 'Tiempo de vida: cuánto dura una llave antes de vencer'],
    ['JWT', 'Credencial firmada que entrega Supabase al iniciar sesión; prueba quién es el usuario'],
    ['Supabase', 'Plataforma en la nube con base de datos PostgreSQL, autenticación y funciones'],
    ['PostgreSQL', 'Sistema de base de datos relacional (tablas)'],
    ['RLS', 'Seguridad a nivel de fila: reglas en la base de datos que deciden qué filas ve cada usuario'],
    ['Service role', 'Llave maestra de Supabase; solo se usa en el servidor'],
    ['Edge Function', 'Pequeño programa que corre en el servidor cuando se le llama por internet'],
    ['Webhook', 'Aviso automático: un servicio llama a una dirección web cuando pasa algo (flespi → registrar)'],
    ['API', 'Forma en que un programa ofrece funciones a otros programas'],
    ['Frontend', 'La parte de la aplicación que ve y usa la persona (la página web)'],
    ['PWA', 'Aplicación web progresiva: página web que se instala en el celular como una app'],
    ['Service worker', 'Script del navegador que maneja la caché y permite instalar la PWA'],
    ['Caché', 'Copia guardada de archivos para cargarlos más rápido o sin internet'],
    ['TypeScript', 'JavaScript con tipos de datos; detecta errores antes de ejecutar'],
    ['Vite', 'Herramienta que compila y empaqueta la web'],
    ['pnpm', 'Gestor de paquetes (instala las librerías)'],
    ['Three.js', 'Librería para gráficos 3D en el navegador'],
    ['Vercel', 'Servicio que publica la página web en internet'],
    ['Gemini / function calling', 'Modelo de IA de Google; “function calling” es pedirle que responda con una orden estructurada'],
    ['Wokwi', 'Simulador en línea de microcontroladores y componentes'],
    ['Binario (.bin)', 'El programa compilado que se graba en el microcontrolador'],
    ['Git / commit', 'Control de versiones / cada cambio guardado con su descripción'],
    ['TDD', 'Desarrollo guiado por pruebas: escribir la prueba antes que el código'],
    ['Prueba unitaria', 'Prueba automática de una pieza pequeña del código'],
    ['Lazo cerrado', 'Control que mide el resultado y corrige (el servo compara su ángulo real con el pedido)'],
], [4.5, 12])

doc.save('Guia_Estudio_Porton_IoT.docx')
print('ok')
