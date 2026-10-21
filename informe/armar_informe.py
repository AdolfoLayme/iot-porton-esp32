# Arma Informe_IoT_Porton_Unidad_I_v2.docx sobre una copia del original (el original no se toca).
import sys
from pathlib import Path
from docx.oxml.ns import qn
from lib_informe import Informe

DOC = Path(__file__).parent
EV, DG = DOC / 'ev', DOC / 'diag'
FW = Path.home() / 'Proyectos/iot-porton-esp32/wokwi'
WOKWI = 'https://wokwi.com/projects/478487086142277633'
APP = 'https://porton-iot.vercel.app'

inf = Informe(str(DOC / 'Informe_IoT_Porton_Unidad_I.docx'))
o = inf.orig

def copiar_con_imagen(i, ruta, ancho_cm):
    """Copia el párrafo de imagen i del original reemplazando la foto (mismo formato)."""
    import copy
    from docx.shared import Cm
    el = copy.deepcopy(o[i])
    rid, img = inf.doc.part.get_or_add_image(str(ruta))
    blip = el.find('.//' + qn('a:blip')); blip.set(qn('r:embed'), rid)
    ext = el.find('.//' + qn('wp:extent')); ancho = int(Cm(ancho_cm)); alto = int(ancho * img.px_height / img.px_width)
    ext.set('cx', str(ancho)); ext.set('cy', str(alto))
    for x in el.iter(qn('a:ext')): x.set('cx', str(ancho)); x.set('cy', str(alto))
    inf.add(el)

# --- Portada: datos de Adolfo ------------------------------------------------
for i, codigo in ((8, '1009320222'), (9, '1004420222'), (10, '1005420222')):
    for r in o[i].iter(qn('w:r')):
        t = r.find(qn('w:t'))
        if t is not None and t.text in ('[CÓDIGO]', '[correo]@unajma.edu.pe'):
            t.text = t.text.replace('[CÓDIGO]', codigo).replace('[correo]', codigo)
            rpr = r.find(qn('w:rPr'))
            if rpr is not None and rpr.find(qn('w:highlight')) is not None:
                rpr.remove(rpr.find(qn('w:highlight')))

# =============================================================================
# 1. INTRODUCCIÓN Y OBJETIVOS
# =============================================================================
inf.h(1, '1. INTRODUCCIÓN Y OBJETIVOS')
inf.h(2, '1.1. Introducción y Justificación')
inf.copiar(20, 21)
inf.p('Frente a ello se propone un portón automático inteligente basado en un ESP32, pensado desde el inicio para ser '
      '**seguro y compartido por varias personas**. El portón se abre, se cierra y se detiene con pulsadores locales o '
      'desde una aplicación web instalable en el celular de cada integrante de la familia, que funciona desde cualquier '
      'red (datos móviles o WiFi). Solo pueden darle órdenes las personas que el administrador registró: cada usuario '
      'inicia sesión con correo y contraseña, recibe una llave temporal y se comunica con el portón a través de un broker '
      'MQTT con cifrado TLS y permisos por usuario. Si dos personas dan órdenes contrarias al mismo tiempo, el ESP32 aplica '
      'reglas de turno: quien empezó el movimiento lo termina, los demás reciben el aviso “ocupado” y la orden PARAR se '
      'acepta siempre. Un sensor ultrasónico HC-SR04 vigila el paso del portón y, si detecta un obstáculo a menos de 20 cm '
      'mientras cierra, detiene el cierre y vuelve a abrir (seguridad anti-aplastamiento).')
inf.p('El sistema se completa con un historial en la nube de todas las órdenes (quién, qué y con qué resultado), la '
      'gestión de miembros por parte del administrador, el control por voz en lenguaje natural y una casa en 3D que '
      'reproduce en tiempo real el estado del portón para la exposición del proyecto.')
inf.p('El trabajo corresponde a la **Unidad I (Simulación Virtual)**. El circuito y el firmware se ejecutan en la '
      'plataforma Wokwi, mientras que la aplicación, el broker y la base de datos son servicios reales en Internet. La '
      'simulación permite probar el circuito y la lógica de control sin riesgo de dañar componentes y repetir los escenarios '
      'cuantas veces haga falta. Además, el firmware se escribió de modo que el mismo código sirva para la maqueta física '
      'de la Unidad II (servo y estructura liviana de cartón): solo cambian la red WiFi y la llave del dispositivo en el '
      'archivo de configuración.')

inf.h(2, '1.2. Objetivos')
inf.h(3, '1.2.1. Objetivo General')
inf.p('Desarrollar un sistema IoT seguro y multiusuario basado en un microcontrolador ESP32, el protocolo MQTT con '
      'cifrado TLS y el sensado ultrasónico HC-SR04 (variable independiente), que permita el control remoto de posición y '
      'la seguridad anti-aplastamiento de un portón automático (variable dependiente) en viviendas residenciales '
      '(población/entorno), validado en el simulador virtual Wokwi, en la ciudad de Andahuaylas – Apurímac (delimitación '
      'geográfica).')
inf.h(3, '1.2.2. Objetivos Específicos')
inf.lista([
    'Diseñar el diagrama de bloques y de conexiones del sistema, estableciendo el mapa de distribución de pines (Pinout) '
    'y la asignación lógica de entradas y salidas (I/O) del ESP32 para tres pulsadores, un sensor HC-SR04, un servomotor, '
    'una pantalla LCD 16×2 por I2C y dos LED con resistencias limitadoras de 220 Ω.',
    'Desarrollar un firmware optimizado y estructurado en C/C++ con control temporal asíncrono mediante `millis()` y una '
    'tarea de red independiente en FreeRTOS, de modo que la lectura del sensor (cada 100 ms), el avance del servo '
    '(15 ms por grado) y la comunicación MQTT con TLS se ejecuten sin retardos bloqueantes en el bucle principal.',
    'Validar en el simulador Wokwi la lógica del programa y el comportamiento dinámico de los componentes en condiciones '
    'normales (apertura, cierre y apertura parcial) y en las rutinas de seguridad (obstáculo, órdenes simultáneas de dos '
    'usuarios y control de acceso).',
    'Integrar una plataforma IoT multiusuario compuesta por un broker MQTT con TLS y listas de control de acceso (flespi), '
    'un servicio de autenticación e historial (Supabase) y una aplicación web instalable con control por voz, que permita '
    'operar el portón desde cualquier red y registre cada orden.',
])

# =============================================================================
# 2. MARCO TEÓRICO BASE
# =============================================================================
inf.h(1, '2. MARCO TEÓRICO BASE')
inf.h(2, '2.1. Arquitectura de Control Embebido')
inf.copiar(34, 35, 36, 37)
inf.nota('Elaboración propia a partir de Arduino (s. f.-a), Espressif Systems (s. f.-a) y Raspberry Pi Ltd. (s. f.).')
inf.copiar(39)
inf.p('En el proyecto se aprovechan estas capacidades así: el WiFi recibe las órdenes y publica el estado; los pines '
      'digitales leen los pulsadores y el sensor; el PWM mueve el servo (Harrington y Bennett, s. f.); el bus I2C maneja '
      'la pantalla, con el GPIO 21 como SDA y el GPIO 22 como SCL por defecto (Espressif Systems, s. f.-b); y el '
      'temporizador interno (`millis()`) reparte las tareas sin detener el programa. Además se aprovechan sus **dos '
      'núcleos**: el bucle físico (sensor, reglas, servo, LED y pantalla) corre en el núcleo 1, y una tarea de FreeRTOS en '
      'el núcleo 0 se encarga de la red (WiFi, hora por NTP, TLS y MQTT). Ambas se comunican mediante colas, de modo que '
      'una conexión lenta nunca retrasa la orden PARAR ni la lectura del sensor (Espressif Systems, s. f.-c).')
inf.copiar(41, 42)
inf.copiar(43, 44)
inf.p('Para este proyecto se usa el broker **flespi** (`mqtt.flespi.io`), un servicio MQTT en la nube que trabaja con '
      'MQTT 3.1.1 y 5.0. El ESP32 se conecta por MQTTS (MQTT sobre TLS, puerto 8883) y la aplicación web, que corre en el '
      'navegador y no puede abrir conexiones TCP puras, se conecta por MQTT sobre WebSockets seguros (WSS, puerto 443) '
      '(flespi, s. f.). En una versión anterior del proyecto se usó un broker público sin autenticación, donde cualquiera '
      'que conociera el nombre del tópico podía mover el portón; esa debilidad es la que motivó la arquitectura actual.')
inf.h(3, 'Seguridad de la comunicación: TLS, llaves y listas de control de acceso')
inf.p('**TLS** (Transport Layer Security) cifra la conexión y permite comprobar la identidad del servidor mediante un '
      'certificado (Rescorla, 2018). El ESP32 guarda el certificado raíz público de la autoridad que firmó al broker y, '
      'antes de conectarse, obtiene la hora por NTP, porque sin una fecha correcta no puede verificar la vigencia del '
      'certificado. Sobre el canal cifrado, cada cliente se identifica con una **llave (token)** propia. Cada llave tiene '
      'una **lista de control de acceso (ACL)** que indica en qué tópicos puede publicar o suscribirse (flespi, s. f.). '
      'Así, el tópico de órdenes de cada usuario es `porton/cmd/<id del usuario>` y solo su propia llave puede publicar '
      'ahí: el portón sabe quién envió la orden por el nombre del tópico, sin confiar en lo que diga el mensaje. Solo la '
      'llave del ESP32 puede publicar el estado del portón, por lo que nadie puede hacerse pasar por él.')
inf.h(3, 'Plataforma de servicios: autenticación, base de datos y funciones')
inf.p('**Supabase** es una plataforma en la nube basada en PostgreSQL que ofrece autenticación de usuarios, base de datos '
      'con seguridad a nivel de fila (RLS) y funciones sin servidor (*Edge Functions*) (Supabase, s. f.). En el proyecto '
      'el registro libre está desactivado: solo el administrador agrega personas. Cuando un miembro activo inicia sesión, '
      'la función `llave-mqtt` le crea en flespi una llave que vence en una hora con los permisos mínimos; si el '
      'administrador lo desactiva, sus llaves se revocan al instante. Cada evento que publica el portón llega por un '
      '*webhook* a la función `registrar`, que lo guarda en la tabla `historial`.')
inf.copiar(46)
inf.p('JSON es un formato de texto liviano para representar datos estructurados (Bray, 2017). El portón publica su estado '
      'como un objeto JSON con la posición actual, la posición objetivo, el estado, la distancia medida, si hay '
      'obstáculo, quién tiene el turno y el estado de los LED, de modo que la aplicación y la casa 3D lo interpretan sin '
      'conocer cómo está programado el ESP32. Las bibliotecas ArduinoJson (Blanchon, s. f.) y el navegador se encargan de '
      'convertirlo.')
inf.h(3, 'Interfaz de usuario: aplicación web instalable y control por voz')
inf.p('La interfaz es una **aplicación web progresiva (PWA)**: se abre desde el navegador y se puede instalar en el '
      'celular como una app, sin pasar por una tienda. El control por voz usa el reconocimiento de voz del navegador '
      '(Web Speech API), que convierte lo que dice el usuario en texto (MDN Web Docs, s. f.). Las órdenes simples '
      '(«abre el portón», «para») se interpretan con reglas locales; las frases libres («déjalo entreabierto», «ábrelo a la '
      'mitad») se envían a la función `voz`, que usa el modelo Gemini de Google con *function calling* para traducirlas a '
      'una orden válida del portón (Google, s. f.). La respuesta se lee en voz alta con la síntesis de voz del navegador.')

inf.h(2, '2.2. Sensores e Instrumentación')
inf.copiar(49, 50, 51, 52)
inf.p('**Funcionamiento con el ESP32.** Para medir, el ESP32 pone TRIG en alto durante 10 µs; el módulo emite la ráfaga '
      'y el pin ECHO permanece en alto durante un tiempo proporcional a la distancia. En el código, `medirDistancia()` '
      'mide ese tiempo con `pulseIn()` y un límite de 25 ms; si no llega eco devuelve 0 (Arduino, s. f.-c) y la función '
      'entrega 400 cm, que es también el valor máximo del sensor. En Wokwi, la distancia se cambia con un control '
      'deslizante entre 2 y 400 cm (Wokwi, s. f.-b).')
inf.p('**Instrumentación.** La lectura se hace cada 100 ms (10 mediciones por segundo). El valor medido se usa de dos '
      'formas: como dato de seguridad (si es menor que 20 cm, se marca obstáculo; si además el portón está cerrando, se '
      'reabre) y como dato de telemetría (se muestra en la pantalla LCD, en la aplicación y en la casa 3D). En el portón '
      'el sensor cumple la función de la **fotocélula** de los portones comerciales: se ubica en el poste, con el haz '
      'cruzando la zona por donde barre la hoja.')
inf.copiar(55)

inf.h(2, '2.3. Actuadores y Acoplamiento de Potencia')
inf.copiar(57, 58, 59)
inf.p('**Indicadores LED.** El LED verde se enciende cuando el portón está completamente abierto. El LED rojo parpadea '
      'mientras el portón se mueve y queda encendido fijo mientras hay un obstáculo en el paso. Cada uno lleva una '
      'resistencia limitadora de 220 Ω en serie. Con una salida de 3,3 V y una caída de tensión del LED de unos 2 V, la '
      'corriente es de aproximadamente (3,3 − 2) / 220 ≈ 6 mA, un valor seguro para el pin del ESP32 y suficiente para que '
      'el LED se vea.')

# =============================================================================
# 3. METODOLOGÍA
# =============================================================================
inf.h(1, '3. METODOLOGÍA')
inf.h(2, '3.1. Metodología de Desarrollo en Entornos Virtuales')
inf.p('El trabajo de esta unidad se desarrolló en un entorno virtual conectado a servicios reales. Primero se armó el '
      'circuito en Wokwi; luego se programó el ESP32 en C++ con las reglas de control probadas por separado; después se '
      'configuraron el broker MQTT con TLS (flespi) y la plataforma de usuarios e historial (Supabase); se construyeron la '
      'aplicación web y la casa 3D; y, por último, se ejecutaron las pruebas sobre el simulador con varios usuarios a la '
      'vez, cada uno desde un dispositivo distinto.')
inf.h(3, '3.1.1. Arquitectura del Circuito en el Simulador')
inf.copiar(65)
inf.n_figura = 1
inf.copiar(66, 67); copiar_con_imagen(68, EV / 'circuito.png', 14.5)
inf.nota('Elaboración propia en la plataforma Wokwi. Las conexiones de cada terminal se detallan en la Tabla 2 y en el Anexo B.')
inf.n_tabla = 2
inf.copiar(70, 71, 72, 73, 74, 75, 76)
inf.p('**Arquitectura general.** El sistema tiene tres partes (Figura 2). En el lado del dispositivo está el ESP32 con '
      'sus periféricos, conectado a Internet por la red WiFi virtual de Wokwi (Wokwi-GUEST) (Wokwi, s. f.-a). En la nube '
      'están el broker flespi, por donde pasan todas las órdenes y la telemetría, y Supabase, que autentica a los usuarios, '
      'entrega las llaves, guarda el historial e interpreta la voz con Gemini. Del lado de los usuarios están la aplicación '
      'de control, que cada persona usa desde su propio celular y su propia red, y la casa 3D, que muestra el estado y le avisa al sensor cuando el carro se detiene bajo el portón. '
      'Ningún usuario se comunica directamente con el ESP32: todo pasa por el broker, que aplica los permisos de cada llave. '
      'En la simulación, el servo, el sensor y la pantalla son componentes virtuales de Wokwi que reproducen el '
      'comportamiento de las piezas reales (Wokwi, s. f.-b, s. f.-c).')
inf.figura(str(DG / 'arquitectura.png'), 'Arquitectura del sistema IoT: dispositivo, nube y usuarios', 16,
           'Elaboración propia. Las flechas indican el sentido de la comunicación. La casa 3D recibe el estado y solo puede publicar en `porton/entorno`.')

inf.h(3, '3.1.2. Entorno de Programación, Simulación y Flujo del Sistema')
inf.h(3, 'Entorno de programación y simulación')
inf.p('El firmware está escrito en C++ con la estructura de Arduino (`setup()` y `loop()`) y se organizó en varios '
      'archivos con una responsabilidad cada uno (Tabla 3). El desarrollo se hizo en Visual Studio Code y en el editor de '
      'Wokwi. Al iniciar la simulación, Wokwi compila el sketch para el ESP32, genera el binario (.bin) y lo carga en el '
      'microcontrolador virtual, que lo ejecuta como si fuera la placa real. Para comprobar que el mismo código entra en '
      'la placa física, también se compiló con `arduino-cli` y el núcleo esp32 3.3.12: ocupa el 81 % de la memoria flash y '
      'el 15 % de la RAM. Las reglas de control (`porton_reglas.h`) no dependen de Arduino, por lo que se probaron por '
      'separado en la computadora con el compilador g++ (Tabla 11).')
inf.tabla('Archivos del firmware del ESP32', ['Archivo', 'Responsabilidad'], [
    ['`sketch.ino`', 'Programa principal: `setup()`, `loop()`, interpretación de órdenes, eventos y publicación del estado.'],
    ['`porton_reglas.h`', 'Reglas de decisión en C++ puro: turno, “ocupado”, PARAR siempre gana, bloqueo por obstáculo, antirrebote de órdenes y pausa de inversión.'],
    ['`fisica.h`', 'Pines, servo, pantalla, lectura del HC-SR04, detección de flanco de los pulsadores y cálculo del estado.'],
    ['`red_firmware.h`', 'Tarea de red en el núcleo 0: WiFi, NTP, TLS y MQTT, comunicada con el bucle físico mediante colas.'],
    ['`config.h`', 'Datos de cada instalación: red WiFi, llave del dispositivo, ángulos y tiempos. Es lo único que cambia entre Wokwi y la maqueta.'],
    ['`flespi_ca.h`', 'Certificado raíz público con el que el ESP32 verifica al broker (TLS).'],
    ['`diagram.json`', 'Circuito de Wokwi (Anexo B).'],
], [2300, 6726], 'Elaboración propia a partir del código fuente (Anexo A).')
inf.tabla('Bibliotecas utilizadas en el firmware', ['Biblioteca', 'Función en el proyecto', 'Elementos usados'], [
    ['WiFi.h y WiFiClientSecure.h', 'Conexión a la red y canal cifrado TLS con verificación del certificado del broker.', '`WiFi.begin()`, `setCACert()`'],
    ['PubSubClient.h', 'Cliente MQTT: conexión con llave, publicación, suscripción y recepción (O\'Leary, 2020).', '`connect()`, `publish()`, `subscribe()`, `loop()`'],
    ['ArduinoJson.h', 'Arma el estado y los eventos en JSON y lee la lista de miembros (Blanchon, s. f.).', '`JsonDocument`, `serializeJson()`'],
    ['ESP32Servo.h', 'Controla el servomotor por PWM (Harrington y Bennett, s. f.).', '`attach()`, `write()`'],
    ['LiquidCrystal_I2C.h', 'Maneja la pantalla LCD por I2C (de Brabander, s. f.).', '`init()`, `setCursor()`, `printf()`'],
    ['FreeRTOS (incluido en el ESP32)', 'Tarea de red en el núcleo 0 y colas entre tareas (Espressif Systems, s. f.-c).', '`xTaskCreatePinnedToCore()`, `xQueueSend()`'],
], [2300, 4426, 2300], 'Elaboración propia a partir del código fuente (Anexo A).')
inf.p('La aplicación web se programó en TypeScript con el empaquetador Vite, la biblioteca `mqtt` para conectarse al '
      'broker por WSS y el cliente de Supabase para el inicio de sesión. La casa 3D se construyó con Three.js y modelos '
      'armados en Blender con materiales de uso libre. Ambas se publicaron en Vercel y se abren desde cualquier navegador: '
      f'la aplicación en {APP} y la casa en {APP}/casa.html. La simulación del circuito está en {WOKWI}.')
inf.h(3, 'Configuración de red y seguridad')
inf.p('Para la simulación, el ESP32 usa la red virtual Wokwi-GUEST (canal 6, sin contraseña) (Wokwi, s. f.-a). Al '
      'arrancar espera la hora por NTP, se conecta a `mqtt.flespi.io:8883` con TLS y su propia llave, registra el mensaje '
      'de última voluntad “0” en `porton/online`, publica “1” en ese mismo tópico como mensaje retenido y se suscribe a '
      '`porton/cmd/+` (las órdenes de todos los usuarios), a `porton/miembros` (los nombres de las personas, para mostrar '
      'quién tiene el turno en la pantalla y en la app) y a `porton/entorno` (lo que el sensor “ve” en la casa 3D). Las cuentas de prueba creadas para la demostración son Admin, '
      'Usuario A y Usuario B; cada una inicia sesión en su propio celular, con su propia red.')
inf.p('**Entorno simulado en la casa 3D.** En Wokwi la distancia del HC-SR04 se fija a mano con su control deslizante. '
      'Para que el sensor también “vea” lo que pasa en la casa 3D, cuando el carro se detiene bajo el portón la casa calcula '
      'la distancia a la que el haz lo corta y la publica en `porton/entorno` cada 0,4 s. El ESP32 combina ese valor con la '
      'lectura del HC-SR04 (usa la menor) y lo descarta si deja de llegar durante 2,5 s, de modo que el sensor funciona igual '
      'con un obstáculo en Wokwi o con el carro en la casa. Como la casa es de tamaño real y el umbral de 20 cm corresponde a '
      'la maqueta, la distancia se convierte a esa escala. La llave de la casa solo puede publicar en ese tópico: en el peor '
      'caso podría impedir que el portón cierre, nunca abrirlo ni moverlo.')
inf.h(3, 'Flujo del sistema: cadena de datos completa')
inf.p('La Figura 3 muestra el recorrido de una orden, desde que el usuario inicia sesión hasta que todos ven el resultado, '
      'incluido el caso de dos usuarios que dan órdenes al mismo tiempo. A continuación se explica paso a paso.')
inf.figura(str(DG / 'flujo.png'), 'Flujo de datos de una orden y de dos órdenes simultáneas', 15,
           'Elaboración propia. Las flechas continuas son órdenes y las discontinuas, respuestas o telemetría.')
inf.lista([
    '**Inicio de sesión.** El usuario entra a la aplicación con su correo y contraseña. Supabase comprueba la cuenta y, si '
    'la persona es miembro activo, la función `llave-mqtt` le entrega una llave que vence en una hora. La aplicación se '
    'conecta al broker con esa llave y la renueva sola cinco minutos antes de que venza.',
    '**Entrada de la orden.** Puede llegar de tres formas: un pulsador físico (el ESP32 detecta el flanco con '
    '`apretado()`), un botón o el control deslizante de la aplicación, o una frase por voz que la aplicación traduce a '
    'una orden. La aplicación publica en `porton/cmd/<su id>` uno de los mensajes `abrir`, `cerrar`, `parar` o `pos:N` '
    '(N entre 0 y 100).',
    '**Control de acceso.** El broker comprueba con la ACL que esa llave puede publicar en ese tópico. Si alguien intenta '
    'publicar como otro usuario o como el portón, el broker lo rechaza con “Not authorized” y el mensaje nunca llega.',
    '**Recepción.** La tarea de red del ESP32 recibe el mensaje y lo deja en una cola. El bucle físico lo toma con '
    '`procesarRed()`, obtiene el id del usuario a partir del tópico, valida el texto (por ejemplo, que `pos:` traiga un '
    'número entre 0 y 100) y llama a `solicitar()`.',
    '**Decisión.** `Reglas.decidir()` aplica, en orden: PARAR se acepta siempre; si hay obstáculo, no se permite cerrar; '
    'una orden repetida del mismo usuario en menos de 300 ms se ignora; si otra persona tiene el turno, la orden se '
    'rechaza como “ocupado”; si no, se acepta, el usuario toma el turno y, si la orden invierte el sentido, se espera '
    '400 ms antes de mover el servo.',
    '**Movimiento con millis().** El servo avanza un grado cada 15 ms hacia el objetivo, el sensor se lee cada 100 ms '
    'y los LED y la pantalla se actualizan en cada vuelta, sin `delay()`. Al llegar al objetivo se libera el turno.',
    '**Seguridad física.** Si el sensor marca menos de 20 cm (un objeto en Wokwi o el carro detenido en la casa 3D) '
    'mientras el portón cierra, el ESP32 libera el turno y ordena abrir en nombre del “sensor”; el cierre queda bloqueado '
    'mientras el obstáculo siga ahí y la app avisa que no se puede cerrar.',
    '**Telemetría de regreso.** Cada decisión se publica en `porton/evento` (quién, qué orden, resultado y motivo) y el '
    'estado en `porton/estado` como mensaje retenido: cada 150 ms mientras se mueve y cada segundo en reposo. El broker lo '
    'entrega a todas las aplicaciones y a la casa 3D, y el *webhook* guarda el evento en el historial.',
])

# =============================================================================
# 4. DISEÑO DE LA LÓGICA DE CONTROL
# =============================================================================
inf.h(1, '4. DISEÑO DE LA LÓGICA DE CONTROL')
inf.h(2, '4.1. Mapeo de Conexiones de Entrada y Salida (Tabla I/O)')
inf.p('La Tabla 5 reúne las entradas, salidas y canales de comunicación del ESP32, con los nombres que se usan en el '
      'código. El circuito es el mismo que en la versión anterior; cambió la lógica y la comunicación.')
inf.tabla('Mapeo de entradas y salidas del ESP32',
          ['Pin', 'Variable en Código', 'Tipo de Señal', 'Tipo de Dato', 'Descripción del Componente', 'Categoría'], [
    ['GPIO 32', 'PIN_BTN_ABRIR', 'Digital (INPUT_PULLUP)', 'bool', 'Pulsador verde: apertura local', 'Entrada'],
    ['GPIO 33', 'PIN_BTN_CERRAR', 'Digital (INPUT_PULLUP)', 'bool', 'Pulsador rojo: cierre local', 'Entrada'],
    ['GPIO 25', 'PIN_BTN_PARAR', 'Digital (INPUT_PULLUP)', 'bool', 'Pulsador amarillo: detención local', 'Entrada'],
    ['GPIO 19', 'PIN_ECHO', 'Digital (ancho de pulso)', 'long (µs) → float (cm)', 'HC-SR04, ECHO: retorno del eco', 'Entrada'],
    ['GPIO 5', 'PIN_TRIG', 'Digital (pulso de 10 µs)', 'bool', 'HC-SR04, TRIG: disparo de la medición', 'Salida'],
    ['GPIO 18', 'PIN_SERVO', 'PWM (50 Hz)', 'int (0° a 90°)', 'Servomotor SG90 que mueve la hoja del portón', 'Salida'],
    ['GPIO 27', 'PIN_LED_VERDE', 'Digital', 'bool', 'LED verde (220 Ω): portón abierto', 'Salida'],
    ['GPIO 26', 'PIN_LED_ROJO', 'Digital', 'bool', 'LED rojo (220 Ω): movimiento u obstáculo', 'Salida'],
    ['GPIO 21 (SDA)', 'lcd', 'I2C (datos)', 'byte', 'LCD 16×2, dirección 0x27', 'Comunicación'],
    ['GPIO 22 (SCL)', 'lcd', 'I2C (reloj)', 'byte', 'LCD 16×2, dirección 0x27', 'Comunicación'],
    ['WiFi interno', 'cliente (tareaRed)', 'Inalámbrica, MQTT sobre TLS (8883)', 'String / JSON', 'Enlace cifrado con el broker flespi: recibe porton/cmd/+ y porton/entorno; publica estado, evento y online', 'Comunicación'],
], [1000, 1750, 1500, 1100, 2400, 1276], 'Elaboración propia a partir de `fisica.h` y `red_firmware.h` (Anexo A).')
inf.p('El sistema tiene cuatro entradas (tres pulsadores y la línea ECHO), cuatro salidas directas (TRIG, servo y dos '
      'LED) y dos canales de comunicación (el bus I2C de la pantalla y el enlace WiFi/MQTT cifrado). Las constantes de '
      'comportamiento están en `config.h`: `ANGULO_CERRADO = 0`, `ANGULO_ABIERTO = 90`, `PASO_MS = 15`, '
      '`DIST_OBSTACULO_CM = 20` y `PAUSA_INVERSION_MS = 400`. Para la maqueta basta con calibrar los ángulos.')
inf.h(3, 'Secuencia de funcionamiento')
inf.tabla('Secuencia de funcionamiento del programa', ['Paso', 'Etapa', 'Qué ocurre', 'Función en el código'], [
    ['1', 'Inicialización', 'Se configuran los pines, el servo se asocia al GPIO 18 y se lleva a 0°, se inicia la pantalla y se crea la tarea de red con sus dos colas.', '`setup()`, `iniciarFisica()`, `iniciarRed()`'],
    ['2', 'Conexión segura', 'La tarea de red conecta el WiFi, espera la hora por NTP, abre TLS con el broker usando la llave del dispositivo, publica “1” en online y se suscribe a las órdenes, a los miembros y al entorno.', '`tareaRed()`'],
    ['3', 'Órdenes remotas', 'Se toman hasta 8 mensajes de la cola, se identifica al usuario por el tópico y se valida el texto.', '`procesarRed()`'],
    ['4', 'Pulsadores locales', 'Se detecta el flanco de cada pulsador; PARAR se lee al final para que gane si se pulsan varios.', '`apretado()`, `solicitar()`'],
    ['5', 'Decisión', 'Cada orden pasa por las reglas de la Tabla 8 y se publica el evento con su resultado.', '`Reglas::decidir()`, `evento()`'],
    ['6', 'Medición y seguridad', 'Cada 100 ms se mide la distancia (la menor entre el HC-SR04 y el entorno de la casa 3D); con menos de 20 cm se marca obstáculo y, si está cerrando, se reabre.', '`medirDistancia()`, `loop()`'],
    ['7', 'Movimiento gradual', 'Cada 15 ms el servo avanza un grado (respetando la pausa de inversión). Al llegar se libera el turno.', '`loop()`'],
    ['8', 'Indicadores', 'LED verde si está abierto; LED rojo parpadeando en movimiento y fijo con obstáculo.', '`loop()`'],
    ['9', 'Telemetría', 'El estado en JSON se publica retenido cada 150 ms en movimiento, cada 1 s en reposo o apenas algo cambia; se refresca la LCD.', '`publicarEstado()`'],
], [700, 1600, 4426, 2300], 'Elaboración propia a partir de `sketch.ino` (Anexo A).')
inf.h(3, 'Estados del portón')
inf.tabla('Estados del portón y comportamiento de los indicadores', ['Estado', 'Cuándo se presenta', 'LED verde', 'LED rojo'], [
    ['cerrado', 'El servo está en el ángulo de cerrado y no hay orden pendiente.', 'Apagado', 'Apagado'],
    ['abriendo', 'El objetivo es mayor que el ángulo actual.', 'Apagado', 'Parpadea'],
    ['cerrando', 'El objetivo es menor que el ángulo actual.', 'Apagado', 'Parpadea'],
    ['pausa', 'Se aceptó una orden que invierte el sentido: espera 400 ms antes de moverse.', 'Apagado', 'Parpadea'],
    ['detenido', 'Se aceptó PARAR o se alcanzó una posición intermedia (apertura parcial).', 'Apagado', 'Apagado'],
    ['abierto', 'El servo llegó al ángulo de abierto.', 'Encendido', 'Apagado'],
    ['(obstáculo)', 'Bandera aparte del estado: el sensor mide menos de 20 cm.', 'Según el estado', 'Fijo'],
], [1500, 4826, 1350, 1350], 'Elaboración propia a partir de `estadoActual()` en `fisica.h`.')
inf.h(3, 'Reglas de control para varios usuarios')
inf.p('Como varias personas pueden tener la aplicación abierta a la vez, el ESP32 decide qué orden se cumple. Las reglas '
      'están en una clase de C++ sin dependencias de Arduino, para poder probarlas en la computadora (Tabla 11) y usar '
      'exactamente el mismo código en Wokwi y en la maqueta.')
inf.tabla('Reglas de decisión aplicadas por el ESP32', ['Orden', 'Regla (en orden de prioridad)', 'Resultado publicado'], [
    ['PARAR', 'Se acepta siempre, venga de quien venga, y libera el turno.', 'aceptada (“parar gana siempre”)'],
    ['Cerrar con obstáculo', 'Si el sensor marca menos de 20 cm, no se permite ninguna orden que cierre.', 'bloqueada (“bloqueado por obstáculo”)'],
    ['Orden repetida', 'La misma persona repite una orden en menos de 300 ms (doble toque).', 'ignorada (“orden repetida”)'],
    ['Turno ocupado', 'Otra persona movió el portón y el movimiento no terminó.', 'ocupado'],
    ['Orden válida', 'Se acepta y quien la dio toma el turno; si invierte el sentido, el servo espera 400 ms.', 'aceptada'],
    ['Texto inválido', '`pos:` fuera de 0 a 100 o una orden desconocida.', 'bloqueada (“porcentaje inválido” u “orden desconocida”)'],
], [1700, 4626, 2700], 'Elaboración propia a partir de `porton_reglas.h` (Anexo A).')
inf.h(3, 'Tópicos MQTT')
inf.tabla('Tópicos MQTT del proyecto y permisos', ['Tópico', 'Sentido', 'Contenido', 'Retenido', 'Quién puede publicar'], [
    ['porton/cmd/<id>', 'App → ESP32', '`abrir`, `cerrar`, `parar`, `pos:0-100`, `ping:<id>`', 'No', 'Solo el usuario dueño de ese id'],
    ['porton/estado', 'ESP32 → todos', 'JSON: pos, objetivo, estado, dist, obstaculo, turno, led', 'Sí', 'Solo el ESP32'],
    ['porton/evento', 'ESP32 → todos', 'JSON: usuario, orden, resultado y motivo', 'No', 'Solo el ESP32'],
    ['porton/pong/<id>', 'ESP32 → app', 'Eco del ping para medir la latencia', 'No', 'Solo el ESP32'],
    ['porton/online', 'ESP32 → todos', '“1” al conectar y “0” como última voluntad (LWT)', 'Sí', 'Solo el ESP32'],
    ['porton/miembros', 'Nube → ESP32 y apps', 'JSON con el nombre de cada miembro activo', 'Sí', 'Solo la función `miembros`'],
    ['porton/entorno', 'Casa 3D → ESP32', 'Distancia (cm) que el HC-SR04 mediría al carro que cruza el haz', 'No', 'Solo la llave de la casa 3D'],
], [1700, 1450, 3026, 950, 1900], 'Elaboración propia. Los permisos se aplican en el broker con la ACL de cada llave.')

# =============================================================================
# 5. DESARROLLO Y RESULTADOS DE PRUEBAS
# =============================================================================
inf.h(1, '5. DESARROLLO Y RESULTADOS DE PRUEBAS')
inf.h(2, '5.1. Implementación del Código Fuente')
inf.p('El programa completo está en el Anexo A. A continuación se presentan los bloques más representativos, con '
      'comentarios en español.')
inf.h(3, 'setup() y loop(): inicialización y bucle sin bloqueos')
inf.p('`setup()` solo prepara el hardware y lanza la tarea de red. `loop()` atiende las órdenes de la red y los '
      'pulsadores y ejecuta tres tareas temporizadas con `millis()`: sensor y seguridad (100 ms), avance del servo '
      '(15 ms) y publicación (150 ms en movimiento, 1 s en reposo). En ninguna se usa `delay()`.')
inf.codigo('Funciones setup() y loop() (sketch.ino)', '''void setup() {
  Serial.begin(115200); iniciarFisica(); iniciarRed();   // hardware + tarea de red (núcleo 0)
}
void loop() {
  static bool a = false, c = false, p = false;
  procesarRed();                        // órdenes que dejó la tarea de red
  if (apretado(PIN_BTN_ABRIR, a)) solicitar("local", Orden::Abrir, 100, "abrir");
  if (apretado(PIN_BTN_CERRAR, c)) solicitar("local", Orden::Cerrar, 0, "cerrar");
  if (apretado(PIN_BTN_PARAR, p)) solicitar("local", Orden::Parar, 0, "parar");  // al final: gana
  uint32_t ahora = millis();
  // Tarea 1: cada 100 ms mide la distancia y revisa la seguridad
  if (ahora - tSensor >= 100) {
    tSensor = ahora; distancia = medirDistancia();
    if (ahora - tEntorno < ENTORNO_VALIDO_MS) distancia = min(distancia, distanciaEntorno);  // carro
    bool anterior = obstaculo; obstaculo = distancia < DIST_OBSTACULO_CM;
    cambio = cambio || anterior != obstaculo;
    if (obstaculo && porcentaje(objetivo) < porcentaje(angulo)) {   // estaba cerrando
      reglas.finMovimiento();                                      // libera el turno
      solicitar("sensor", Orden::Abrir, 100, "abrir");             // y reabre
    }
  }
  // Tarea 2: cada 15 ms avanza 1° hacia el objetivo (respeta la pausa de inversión)
  if (ahora - tPaso >= (uint32_t)PASO_MS && ahora - tPausa >= pausaMs && angulo != objetivo) {
    tPaso = ahora; angulo += objetivo > angulo ? 1 : -1; servo.write(angulo);
    if (angulo == objetivo) { reglas.finMovimiento(); cambio = true; }
  }
  // Indicadores: verde = abierto; rojo parpadea en movimiento y queda fijo con obstáculo
  verde = angulo == ANGULO_ABIERTO && angulo == objetivo;
  bool nuevoRojo = obstaculo || (angulo != objetivo && (ahora / 250) % 2);
  cambio = cambio || nuevoRojo != rojo; rojo = nuevoRojo;
  digitalWrite(PIN_LED_VERDE, verde); digitalWrite(PIN_LED_ROJO, rojo);
  // Tarea 3: telemetría cada 150 ms en movimiento, 1 s en reposo o apenas algo cambia
  if (cambio || ahora - tPublica >= (angulo != objetivo ? 150U : 1000U)) {
    cambio = false; tPublica = ahora; publicarEstado();
  }
}''')
inf.h(3, 'Reglas de decisión para varios usuarios')
inf.p('`decidir()` recibe la orden con el usuario que la envió y devuelve el resultado, el motivo, el porcentaje objetivo '
      'y si hay que esperar la pausa de inversión. El orden de los `if` es el orden de prioridad de la Tabla 8.')
inf.codigo('Método Reglas::decidir() (porton_reglas.h)', '''Decision decidir(const Peticion& p, int posPct, int objetivoPct, bool obstaculo) {
  if (p.orden == Orden::Parar) {                         // 1. PARAR gana siempre
    finMovimiento();
    return {Resultado::Aceptada, "parar gana siempre", posPct, 0};
  }
  const int destino = p.orden == Orden::Abrir ? 100 :
    (p.orden == Orden::Cerrar ? 0 : acotar(p.pct));
  if (obstaculo && destino < posPct)                     // 2. no se cierra sobre un obstáculo
    return {Resultado::Bloqueada, "bloqueado por obstáculo", objetivoPct, 0};
  if (repetida(p))                                       // 3. doble toque en < 300 ms
    return {Resultado::Ignorada, "orden repetida", objetivoPct, 0};
  if (turno_[0] && std::strcmp(turno_, p.usuario))       // 4. otra persona tiene el turno
    return {Resultado::Ocupado, "ocupado", objetivoPct, 0};
  const bool invierte = (objetivoPct > posPct && destino < posPct) ||
                        (objetivoPct < posPct && destino > posPct);
  if (destino != posPct) copiar(turno_, p.usuario);      // 5. aceptada: toma el turno
  else finMovimiento();
  return {Resultado::Aceptada, "aceptada", destino, invierte ? pausa_ : 0};
}''')
inf.h(3, 'Recepción de órdenes: identidad por el tópico')
inf.p('`procesarRed()` toma los mensajes que dejó la tarea de red. El id del usuario se obtiene del nombre del tópico, '
      'que el broker ya validó con la ACL, y el texto se valida antes de llegar a las reglas.')
inf.codigo('Fragmento de procesarRed() (sketch.ino)', '''String prefijo = tema("cmd/");
if (!canal.startsWith(prefijo)) continue;
String usuario = canal.substring(prefijo.length());   // id = final del tópico
if (!usuario.length() || usuario.length() > 40 || usuario.indexOf('/') >= 0) continue;
if (texto.startsWith("ping:")) { emitir(tema(("pong/" + usuario).c_str()), texto); continue; }
Orden orden; int pct = 0;
if (texto == "abrir") orden = Orden::Abrir;
else if (texto == "cerrar") orden = Orden::Cerrar;
else if (texto == "parar") orden = Orden::Parar;
else if (texto.startsWith("pos:")) {                    // apertura parcial: 0 a 100, nada más
  char* fin; long valor = strtol(texto.c_str() + 4, &fin, 10);
  if (fin == texto.c_str() + 4 || *fin || valor < 0 || valor > 100) {
    evento(usuario.c_str(), texto, Resultado::Bloqueada, "porcentaje inválido"); continue;
  }
  orden = Orden::Ir; pct = valor;
} else {
  evento(usuario.c_str(), texto, Resultado::Bloqueada, "orden desconocida"); continue;
}
solicitar(usuario.c_str(), orden, pct, texto);''')
inf.h(3, 'Tarea de red: TLS y MQTT sin bloquear el control')
inf.p('La red corre en otra tarea de FreeRTOS fijada al núcleo 0. Si el WiFi o el broker tardan, solo espera esta tarea: '
      'el bucle físico sigue leyendo el sensor y atendiendo PARAR. Sin la hora correcta no intenta TLS, porque no podría '
      'validar el certificado.')
inf.codigo('Fragmento de tareaRed() (red_firmware.h)', '''WiFiClientSecure transporte; transporte.setCACert(MQTT_CA_RAIZ);   // verifica al broker
PubSubClient cliente(transporte);
cliente.setServer("mqtt.flespi.io", 8883);
configTime(0, 0, "pool.ntp.org", "time.google.com");
for (;;) {
  if (WiFi.status() == WL_CONNECTED && !cliente.connected() && millis() - intento >= 3000) {
    intento = millis();
    if (time(nullptr) < 1700000000) {                   // sin hora no se valida TLS
      Serial.println("MQTT: esperando la hora (NTP) para validar TLS"); continue;
    }
    // llave del dispositivo como usuario; última voluntad "0" retenida en porton/online
    bool ok = cliente.connect(id.c_str(), MQTT_TOKEN, "",
                              tema("online").c_str(), 1, true, "0");
    if (ok) {
      cliente.subscribe(tema("cmd/+").c_str()); cliente.subscribe(tema("miembros").c_str());
      cliente.subscribe(tema("entorno").c_str());     // lo que el sensor "ve" en la casa 3D
      cliente.publish(tema("online").c_str(), "1", true);
    }
  }
  if (cliente.connected()) {
    cliente.loop();                       // lo recibido pasa a la cola de entrada
    for (int i = 0; i < 8 && xQueueReceive(salidaRed, &m, 0) == pdTRUE; ++i)
      cliente.publish(m.tema, m.texto, m.retenido);     // publica lo que dejó el bucle físico
  } else xQueueReset(salidaRed);          // no reenviar órdenes viejas
  vTaskDelay(pdMS_TO_TICKS(5));
}''')
inf.h(3, 'Sensado ultrasónico y telemetría')
inf.codigo('Funciones medirDistancia() (fisica.h) y publicarEstado() (sketch.ino)', '''float medirDistancia() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);   // pulso de 10 µs
  digitalWrite(PIN_TRIG, LOW);
  long us = pulseIn(PIN_ECHO, HIGH, 25000);             // tiempo de vuelo (máx. 25 ms)
  return us ? us / 58.0f : 400;                         // d = t / 58; sin eco = 400 cm
}
void publicarEstado() {
  JsonDocument d;
  d["pos"] = porcentaje(angulo); d["objetivo"] = porcentaje(objetivo);
  d["estado"] = estadoActual();
  d["dist"] = (int)distancia; d["obstaculo"] = obstaculo;
  if (reglas.turno()) {                                 // quién tiene el turno
    d["turno"]["id"] = reglas.turno(); d["turno"]["nombre"] = nombreUsuario(reglas.turno());
  }
  else d["turno"] = nullptr;
  d["led"]["verde"] = verde; d["led"]["rojo"] = rojo;
  String json; serializeJson(d, json); emitir(tema("estado"), json, true);   // retenido
  lcd.setCursor(0, 0); lcd.printf("%-10s %3d%%  ", estadoActual(), porcentaje(angulo));
  lcd.setCursor(0, 1); lcd.printf("Dist: %3.0f cm    ", distancia);
}''')
inf.h(3, 'Uso de millis() y bloqueos')
inf.p('`millis()` devuelve los milisegundos transcurridos desde el arranque (Arduino, s. f.-b). Con él se temporizan el '
      'sensor (100 ms), el servo (15 ms por grado), la pausa de inversión (400 ms), el parpadeo del LED (250 ms) y la '
      'publicación. Con 15 ms por grado, el recorrido completo de 90° toma 1,35 s de tiempo simulado. En el bucle '
      'principal no hay `delay()`; el único punto de espera es `pulseIn()`, que dura cerca de 1,2 ms para un objeto a '
      '20 cm y como máximo 25 ms sin eco. Los bucles de reconexión que en la versión anterior detenían todo el programa '
      'se trasladaron a la tarea de red, que corre en el otro núcleo.')

inf.h(2, '5.2. Protocolo de Pruebas y Resultados Experimentales')
inf.p('Las pruebas se ejecutaron el 21/10/2026 sobre la simulación de Wokwi conectada a los servicios reales. Cada usuario '
      'usó su propia sesión en un navegador separado, como si fueran celulares distintos, y la distancia del HC-SR04 se '
      'cambió con el control deslizante de Wokwi (en la prueba 2.4, el obstáculo es el carro de la casa 3D). La distancia normal fue de 100 cm (la pantalla muestra 101 cm porque el '
      'código divide entre 58 y el eco simulado corresponde a 58,3 µs/cm). La simulación corrió entre el 55 % y el 87 % '
      'del tiempo real, por lo que los tiempos se interpretan en el reloj del simulador. La latencia de ida y vuelta '
      'entre la aplicación y el ESP32 medida por la aplicación estuvo entre 674 y 960 ms.')
inf.tabla('Protocolo de pruebas de simulación y resultados', ['N.º', 'Prueba', 'Procedimiento', 'Resultado esperado', 'Resultado observado', 'Estado'], [
    ['1.1', 'Apertura remota', 'Usuario A pulsa Abrir en la app con el portón cerrado.', 'Abre hasta 100 %, LED rojo parpadea en el recorrido y LED verde al final.', 'La LCD pasó de “abriendo” a “abierto 100%”, el LED verde quedó encendido y la app mostró “Portón abierto” (Figuras 4 y 5).', 'Conforme'],
    ['1.2', 'Cierre remoto', 'Usuario A pulsa Cerrar sin objetos en el paso.', 'Cierra hasta 0 % sin interrupciones.', 'La LCD llegó a “cerrado 0%” y la app mostró “Portón cerrado”.', 'Conforme'],
    ['1.3', 'Apertura parcial', 'Usuario A fija el deslizador en 50 % y pulsa “Ir a 50 %” (`pos:50`).', 'El servo se detiene en 45°; estado “detenido” con 50 %.', 'La LCD mostró “detenido 50%” y la app “Portón detenido 50 %” (Figura 5).', 'Conforme'],
    ['1.4', 'Pulsador físico', 'Pulsar ABRIR en el circuito de Wokwi.', 'Se acepta como usuario “local” y queda en el historial.', 'El evento `"usuario":"local"` apareció en la consola y el historial lo registró como “Botón físico abrió el portón” (Figura 14).', 'Conforme'],
    ['2.1', 'Obstáculo durante el cierre', 'Con el portón cerrando, bajar el HC-SR04 a 10 cm.', 'Reabre de inmediato a nombre del “sensor”; LED rojo fijo.', 'La consola registró `"usuario":"sensor","orden":"abrir","resultado":"aceptada"`, la LCD mostró “abriendo … Dist: 10 cm” y la app “Obstáculo detectado” (Figuras 6 y 7).', 'Conforme'],
    ['2.2', 'Cerrar con obstáculo presente', 'Con el sensor en 10 cm, Usuario A pulsa Cerrar.', 'La orden se rechaza y el portón no se mueve.', 'Resultado “bloqueada”, motivo “bloqueado por obstáculo”; la app mostró “Usuario A: no se puede cerrar, hay un obstáculo en el paso del portón.” (Figura 7).', 'Conforme'],
    ['2.3', 'Paso despejado', 'Devolver el sensor a 100 cm y pulsar Cerrar.', 'Cierra completo sin reabrir.', 'La LCD llegó a “cerrado 0%”.', 'Conforme'],
    ['2.4', 'Carro detenido en el portón (casa 3D)', 'Con el portón abierto, el carro de la casa 3D se detiene bajo el portón (“Parar en el portón”) y Usuario A pulsa Cerrar.', 'El sensor detecta el carro, el portón no cierra y la app avisa que hay un obstáculo.', 'El ESP32 midió 6 cm y marcó obstáculo; la orden quedó “bloqueada” y la app mostró “Usuario A: no se puede cerrar, hay un obstáculo en el paso del portón.”. Al entrar el carro a la cochera, el portón cerró normal (Figura 8).', 'Conforme'],
    ['3.1', 'Dos usuarios a la vez', 'Mientras A abre, Usuario B pulsa Cerrar desde otro dispositivo.', 'La orden de B se rechaza como “ocupado”; el portón sigue abriendo.', 'La consola registró el `"resultado":"ocupado"` de B; la app de B mostró “Usuario B: ocupado” y ambas apps “Usuario A está abriendo” (Figuras 9 y 10).', 'Conforme'],
    ['3.2', 'PARAR de otro usuario', 'Mientras A cierra, B pulsa Parar.', 'Se acepta aunque el turno sea de A.', 'Resultado “aceptada”, motivo “parar gana siempre”; el portón quedó “detenido 85%” (Figura 11).', 'Conforme'],
    ['4.1', 'Contraseña incorrecta', 'Intentar entrar con una contraseña errónea.', 'No entra y se muestra el error junto al formulario.', 'La app mostró “Correo o contraseña incorrectos.” y marcó los campos en rojo (Figura 12).', 'Conforme'],
    ['4.2', 'Control de acceso', 'Ejecutar la prueba automática de seguridad (Tabla 11).', 'Solo las llaves legítimas publican; un miembro desactivado pierde el acceso.', '12 de 12 comprobaciones superadas (Figura 13).', 'Conforme'],
], [500, 1250, 1750, 1750, 2776, 1000], 'Elaboración propia. Los resultados observados corresponden a las ejecuciones del 21/10/2026.')
inf.p('Además de las pruebas sobre la simulación, se automatizaron tres grupos de pruebas que se pueden repetir con un '
      'comando y sirven de control antes de cada cambio (Tabla 11).')
inf.tabla('Pruebas automatizadas del sistema', ['Grupo', 'Qué comprueba', 'Herramienta', 'Resultado'], [
    ['Reglas del firmware', 'PARAR siempre gana, bloqueo por obstáculo, turno y “ocupado”, pausa de inversión, antirrebote y límites de `pos:`.', 'g++ con `assert` (`pruebas/reglas_test.cpp`)', '7/7 superadas'],
    ['Aplicación web', 'Lectura del estado y de los eventos, textos de la interfaz e interpretación de órdenes por voz.', 'Vitest', '48/48 superadas'],
    ['Seguridad de punta a punta', 'Sin sesión no hay llave; A no puede publicar como B ni como el portón; un token inventado no conecta; al desactivar a B se revocan sus llaves y al reactivarlo las recupera; un miembro común no gestiona miembros.', 'Script con Supabase y flespi reales (`herramientas/probar-seguridad.mjs`)', '12/12 superadas'],
], [1700, 4026, 2100, 1200], 'Elaboración propia.')

inf.h(3, 'Evidencias')
inf.p('Las figuras muestran a la vez el simulador (circuito, pantalla LCD, LED y consola serie con los eventos en JSON) '
      'y la aplicación de control de cada usuario.')
inf.figura(str(EV / 'w-12-abierto.png'), 'Caso 1: portón abierto en Wokwi (LCD “abierto 100%”, LED verde encendido y consola serie con los eventos)', 16,
           'Captura de la simulación. En la consola se ven los eventos JSON con el usuario, la orden y el resultado.')
inf.figura(str(EV / 'par-abierto-parcial.png'), 'Caso 1: app de Usuario A con el portón abierto (izquierda) y en apertura parcial al 50 % (derecha)', 11)
inf.figura(str(EV / 'w-21-obstaculo.png'), 'Caso 2: obstáculo a 10 cm durante el cierre; el ESP32 reabre a nombre del “sensor”', 16,
           'El panel superior de Wokwi es el control del HC-SR04, fijado en 10 cm. La última línea de la consola es el evento del usuario “sensor” con la orden “abrir”.')
inf.figura(str(EV / 'par-obstaculo.png'), 'Caso 2: app con “Obstáculo detectado” (izquierda) y el aviso de que no se puede cerrar (derecha)', 11)
inf.figura(str(EV / 'par-carro.png'), 'Caso 2: el carro de la casa 3D detenido bajo el portón (izquierda) y la app rechazando el cierre (derecha)', 16,
           'El haz del sensor se ve en rojo bajo el carro; la app muestra la distancia de 6 cm y el aviso de obstáculo.')
inf.figura(str(EV / 'w-31-ocupado.png'), 'Caso 3: Usuario B intenta cerrar mientras Usuario A abre; el ESP32 responde “ocupado”', 16,
           'La última línea de la consola muestra el evento de Usuario B con `"resultado":"ocupado"`.')
inf.figura(str(EV / 'par-ocupado.png'), 'Caso 3: app de Usuario A con el turno (izquierda) y app de Usuario B con el aviso “ocupado” (derecha)', 11)
inf.figura(str(EV / 'w-32-parar.png'), 'Caso 3: PARAR de Usuario B aceptado durante el cierre de Usuario A (“parar gana siempre”)', 16)
inf.figura(str(EV / 'par-login.png'), 'Inicio de sesión: formulario con opción para ver la contraseña (izquierda) y error por contraseña incorrecta (derecha)', 11)
inf.figura(str(EV / 'pruebas.png'), 'Salida de las pruebas automatizadas: seguridad (12/12), reglas del firmware (7/7) y aplicación (48/48)', 14)
inf.figura(str(EV / 'par-admin.png'), 'Vista del administrador: historial de órdenes guardado en la nube (izquierda) y gestión de miembros (derecha)', 11,
           'El historial incluye las órdenes de todos los usuarios, del botón físico y del sensor; el interruptor quita o devuelve el acceso al instante.')
inf.figura(str(EV / 'd-app-escritorio.png'), 'Aplicación de control en una computadora (Usuario A, portón abierto)', 15)
inf.figura(str(EV / 'c-casa-abierto.png'), 'Casa 3D sincronizada con el ESP32: portón abierto, baliza verde y sensor en su poste', 15,
           f'La casa se abre sin iniciar sesión en {APP}/casa.html; su llave lee el estado y solo puede publicar en `porton/entorno`.')

# =============================================================================
# 6. CONCLUSIONES Y RECOMENDACIONES
# =============================================================================
inf.h(1, '6. CONCLUSIONES Y RECOMENDACIONES')
inf.h(2, '6.1. Conclusiones')
inf.lista([
    'Se diseñó en Wokwi el circuito del portón con un ESP32, un servomotor SG90, un sensor HC-SR04, una pantalla LCD 16×2 '
    'por I2C, tres pulsadores y dos LED con resistencias de 220 Ω. Las conexiones quedaron definidas pin por pin en el '
    '`diagram.json` y documentadas en la Tabla I/O (Tabla 5), con lo que se cumplió el primer objetivo específico.',
    'Se desarrolló un firmware modular en C++ sin retardos bloqueantes: `millis()` reparte el sensor, el servo, los LED y '
    'la telemetría, y la red corre en una tarea de FreeRTOS en el otro núcleo. Así, el portón sigue atendiendo PARAR y el '
    'sensor aunque la red esté lenta o caída. Las reglas de decisión, separadas en una clase sin dependencias, superaron '
    'sus 7 pruebas automáticas.',
    'Se validó el sistema en Wokwi: las 12 pruebas del protocolo resultaron conformes. El portón abre, cierra y acepta '
    'posiciones parciales; ante un obstáculo durante el cierre reabre y rechaza nuevas órdenes de cierre, también cuando el obstáculo es el carro detenido en la casa 3D; y cuando dos '
    'usuarios dan órdenes contrarias, respeta el turno de quien empezó, avisa “ocupado” al otro y acepta PARAR de '
    'cualquiera.',
    'Se integró una plataforma IoT segura y multiusuario: solo las personas que agrega el administrador pueden controlar '
    'el portón, cada una con una llave temporal limitada a su propio tópico, sobre una conexión cifrada con TLS. La prueba '
    'de seguridad superó sus 12 comprobaciones. La aplicación funciona desde cualquier red, registra cada orden en un '
    'historial y admite control por voz; la casa 3D refleja el estado en tiempo real para la exposición.',
    'En conjunto se cumplió el objetivo general de la Unidad I. Como el firmware separa la configuración de la lógica, el '
    'mismo código se usará en la maqueta de la Unidad II cambiando solo la red WiFi, la llave del dispositivo y la '
    'calibración de los ángulos del servo.',
])
inf.h(2, '6.2. Recomendaciones')
inf.lista([
    '**Paso a la maqueta (objetivo 1).** La salida ECHO del HC-SR04 entrega 5 V y el ESP32 trabaja a 3,3 V: usar un '
    'divisor de tensión (1 kΩ y 2 kΩ) o un conversor de nivel. Alimentar el servo con una fuente externa de 5 V que '
    'comparta tierra con el ESP32, agregar un capacitor cerca del servo y antirrebote a los pulsadores, y calibrar '
    '`ANGULO_CERRADO` y `ANGULO_ABIERTO` con la hoja de cartón ya montada. Revisar que el GPIO 5 (pin de arranque) no '
    'cause problemas al encender la placa.',
    '**Firmware (objetivo 2).** Agregar un perro guardián (*watchdog*) que reinicie la placa si una tarea se cuelga, '
    'compensar la velocidad del sonido con la temperatura y filtrar la lectura del sensor (por ejemplo, mediana de tres '
    'lecturas) para evitar falsos obstáculos en el entorno real, que tiene más ruido que la simulación.',
    '**Validación (objetivo 3).** Ampliar el protocolo con casos límite: 19, 20 y 21 cm alrededor del umbral, pérdida y '
    'regreso del WiFi durante un movimiento, y tres o más usuarios a la vez. Repetir cada prueba varias veces y registrar '
    'los tiempos medidos en la maqueta, donde no existe la variación de velocidad del simulador.',
    '**Plataforma (objetivo 4).** Antes de un uso real, cambiar las contraseñas de prueba por contraseñas fuertes, '
    'renovar la llave del dispositivo antes de su vencimiento y revocarla si el proyecto de Wokwi se hace público. Como '
    'mejora, se pueden agregar notificaciones al celular cuando el portón quede abierto demasiado tiempo o se desconecte.',
])

# =============================================================================
# 7. REFERENCIAS
# =============================================================================
inf.h(1, '7. REFERENCIAS BIBLIOGRÁFICAS')
for r in [
    'Arduino. (s. f.-a). *Arduino Uno Rev3*. https://docs.arduino.cc/hardware/uno-rev3/',
    'Arduino. (s. f.-b). *millis()*. Arduino Documentation. https://docs.arduino.cc/language-reference/en/functions/time/millis/',
    'Arduino. (s. f.-c). *pulseIn()*. Arduino Documentation. https://docs.arduino.cc/language-reference/en/functions/advanced-io/pulseIn/',
    'Banks, A., y Gupta, R. (Eds.). (2014). *MQTT version 3.1.1* (OASIS Standard). OASIS. http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html',
    'Blanchon, B. (s. f.). *ArduinoJson* [Software]. https://arduinojson.org',
    'Bray, T. (Ed.). (2017). *The JavaScript Object Notation (JSON) data interchange format* (RFC 8259). Internet Engineering Task Force. https://www.rfc-editor.org/rfc/rfc8259',
    'de Brabander, F. (s. f.). *LiquidCrystal I2C* [Software]. GitHub. https://github.com/fdebrabander/arduino-liquidcrystal-i2c-library',
    'Elecfreaks. (s. f.). *Ultrasonic ranging module HC-SR04* [Hoja de datos]. Elecfreaks.',
    'Espressif Systems. (s. f.-a). *ESP32 series datasheet*. https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf',
    'Espressif Systems. (s. f.-b). *I2C*. Arduino-ESP32 Documentation. https://docs.espressif.com/projects/arduino-esp32/en/latest/api/i2c.html',
    'Espressif Systems. (s. f.-c). *FreeRTOS (ESP-IDF)*. ESP-IDF Programming Guide. https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/freertos.html',
    'flespi. (s. f.). *MQTT broker* [Documentación técnica]. Gurtam. https://flespi.com/mqtt-broker',
    'Google. (s. f.). *Function calling with the Gemini API*. Google AI for Developers. https://ai.google.dev/gemini-api/docs/function-calling',
    'Harrington, K., y Bennett, J. K. (s. f.). *ESP32Servo* [Software]. GitHub. https://github.com/madhephaestus/ESP32Servo',
    'MDN Web Docs. (s. f.). *Web Speech API*. Mozilla. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API',
    'O\'Leary, N. (2020). *PubSubClient: Arduino client for MQTT* (Versión 2.8) [Software]. https://pubsubclient.knolleary.net',
    'Raspberry Pi Ltd. (s. f.). *Raspberry Pi documentation*. https://www.raspberrypi.com/documentation/',
    'Rescorla, E. (2018). *The Transport Layer Security (TLS) protocol version 1.3* (RFC 8446). Internet Engineering Task Force. https://www.rfc-editor.org/rfc/rfc8446',
    'Supabase. (s. f.). *Supabase documentation: Auth, Database y Edge Functions*. https://supabase.com/docs',
    'TowerPro. (s. f.). *SG90 9g micro servo* [Hoja de datos]. TowerPro.',
    'Wokwi. (s. f.-a). *ESP32 WiFi networking*. Wokwi Docs. https://docs.wokwi.com/guides/esp32-wifi',
    'Wokwi. (s. f.-b). *HC-SR04 ultrasonic distance sensor*. Wokwi Docs. https://docs.wokwi.com/parts/wokwi-hc-sr04',
    'Wokwi. (s. f.-c). *Servo*. Wokwi Docs. https://docs.wokwi.com/parts/wokwi-servo',
]:
    inf.ref(r)

# =============================================================================
# 8. ANEXOS
# =============================================================================
inf.h(1, '8. ANEXOS')
inf.h(2, 'Anexo A. Código Fuente Completo del Proyecto')
inf.p('Se transcribe íntegro todo el código usado en el proyecto, ordenado por componente: firmware del ESP32 y sus '
      'pruebas (A.1), servicios en la nube de Supabase (A.2), aplicación de control (A.3) y herramientas de '
      'configuración y prueba (A.4). En `config.h` se ocultan los valores privados (la llave del dispositivo). Las hojas '
      'de estilo CSS se presentan con una declaración por línea para facilitar su lectura; su contenido no cambia. No se '
      'incluyen las bibliotecas de terceros (mqtt, supabase-js, GSAP), que se instalan con el gestor de paquetes, '
      'ni las fuentes tipográficas. La casa 3D de la exposición es un complemento visual y no forma parte del '
      'sistema de control, por lo que su código no se transcribe.')
RAIZ = Path.home() / 'Proyectos/iot-porton-esp32'
def css_legible(t):
    import re as r
    t = r.sub(r'\s*\{\s*', ' {\n  ', t); t = r.sub(r';\s*(?=[^\s}])', ';\n  ', t); t = r.sub(r';?\s*\}\s*', ';\n}\n', t)
    return r.sub(r'\n  ;\n', '\n', t)
def privado(t):
    return _re.sub(r'(MQTT_TOKEN|SECRETO_DISPOSITIVO|URL_REGISTRAR) = "[^"]*"', r'\1 = "<valor privado>"', t)
import re as _re
GRUPOS = [
    ('A.1. Firmware del ESP32 (Wokwi y maqueta)', ['wokwi/sketch.ino', 'wokwi/porton_reglas.h', 'wokwi/fisica.h',
        'wokwi/red_firmware.h', 'wokwi/config.h', 'wokwi/flespi_ca.h', 'wokwi/libraries.txt', 'pruebas/reglas_test.cpp', 'pruebas/correr.sh']),
    ('A.2. Servicios en la nube (Supabase)', ['supabase/migrations/20261021000000_porton.sql', 'supabase/functions/_compartido/comun.ts',
        'supabase/functions/llave-mqtt/index.ts', 'supabase/functions/miembros/index.ts', 'supabase/functions/registrar/index.ts',
        'supabase/functions/voz/index.ts']),
    ('A.3. Aplicación de control (web instalable)', ['web/index.html', 'web/vite.config.ts', 'web/src/app/inicio.ts',
        'web/src/app/admin.ts', 'web/src/app/movimiento.ts', 'web/src/app/dom.ts', 'web/src/app/pwa.ts', 'web/src/red/sesion.ts',
        'web/src/red/conexion.ts', 'web/src/red/modos.ts', 'web/src/estado/porton.ts', 'web/src/voz/microfono.ts',
        'web/src/voz/interpretar.ts', 'web/src/estilos/base.css', 'web/src/estilos/app.css', 'web/public/sw.js',
        'web/public/manifest.webmanifest', 'web/tests/porton.test.ts', 'web/tests/interpretar.test.ts']),
    ('A.4. Herramientas de configuración y prueba', ['herramientas/sembrar.mjs', 'herramientas/token-dispositivo.mjs',
        'herramientas/token-visor.mjs', 'herramientas/probar-seguridad.mjs', 'herramientas/probar-portón-vivo.mjs']),
]
total_lineas = 0
for titulo, archivos in GRUPOS:
    inf.h(3, titulo)
    for rel in archivos:
        texto = (RAIZ / rel).read_text()
        if rel.endswith('.css'): texto = css_legible(texto)
        if rel.endswith('config.h'): texto = privado(texto)
        total_lineas += texto.count('\n') + 1
        p = inf._p_desde(inf.t_titulo); inf._texto(p, f'Archivo {rel}', base_i=True); inf.add(p)
        inf.codigo('', texto, tam=14, etiqueta=False)
print('lineas de codigo en el anexo:', total_lineas)

inf.copiar(501, 502, 503, 504); copiar_con_imagen(505, EV / 'circuito.png', 15.5); inf.copiar(*range(506, 512))
for linea in (FW / 'diagram.json').read_text().rstrip('\n').split('\n'):
    p = inf._p_desde(inf.t_codigo); p.append(inf._run(linea or ' ', mono=True, tam=16)); inf.add(p)

inf.h(2, 'Anexo C. Acceso a la Demostración')
inf.tabla('Enlaces y cuentas de prueba', ['Recurso', 'Dirección o dato'], [
    ['Aplicación de control', APP],
    ['Casa 3D', f'{APP}/casa.html'],
    ['Simulación en Wokwi', WOKWI],
    ['Usuario A', 'usuario.a@porton-iot.app'],
    ['Usuario B', 'usuario.b@porton-iot.app'],
    ['Administrador', 'admin@porton-iot.app (lo maneja el grupo)'],
], [2600, 6426], 'La contraseña de prueba se entrega en la exposición. La simulación de Wokwi debe estar en ejecución para que el portón aparezca en línea.', etiqueta='Tabla C1')

salida = DOC / 'Informe_IoT_Porton_Unidad_I_v2.docx'
inf.guardar(17, str(salida))
print('ok', salida, 'figuras', inf.n_figura, 'tablas', inf.n_tabla)
