"""Arma la escena "casa real con portón automático" y exporta web/public/casa/casa.glb.

Uso:
  blender -b -P herramientas/armar-casa.py
  blender -b -P herramientas/armar-casa.py -- --revisar   (además renderiza una vista previa)

Escala real, en metros. Ejes de Blender: X a lo ancho, Y hacia la calle (frente), Z arriba.
El exportador glTF convierte a Y arriba: el frente de la casa queda mirando a -Z.
"""
import bpy
import mathutils
import math
import os
import sys
from mathutils import Matrix, Vector

RAIZ = '/home/adolfo/Proyectos/iot-porton-esp32'
FUENTES = f'{RAIZ}/recursos/casa-fuentes'  # fuera de public: no se publica (261 MB)
SALIDA = f'{RAIZ}/web/public/casa/casa.glb'
REVISAR = '--revisar' in sys.argv

# ---------------------------------------------------------------- utilidades


def importar(ruta):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    return [o for o in bpy.data.objects if o not in antes]


def centro_local(o):
    bb = [Vector(v) for v in o.bound_box]
    return sum(bb, Vector()) / len(bb)


def centrar(o):
    """Lleva el centro de la geometría al origen del objeto y limpia transformaciones."""
    o.data.transform(Matrix.Translation(-centro_local(o)))
    o.location = (0, 0, 0)
    o.rotation_euler = (0, 0, 0)
    o.scale = (1, 1, 1)


def medir(o):
    bb = [Vector(v) for v in o.bound_box]
    mn = Vector((min(p.x for p in bb), min(p.y for p in bb), min(p.z for p in bb)))
    mx = Vector((max(p.x for p in bb), max(p.y for p in bb), max(p.z for p in bb)))
    return mn, mx


def bbox_mundo(objetos):
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objetos:
        if o.type != 'MESH':
            continue
        for v in o.bound_box:
            p = o.matrix_world @ Vector(v)
            for i in range(3):
                mn[i] = min(mn[i], p[i])
                mx[i] = max(mx[i], p[i])
    return mn, mx


def material(nombre, color, rough=.8, metal=0., emision=None, fuerza=0., alpha=1.):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    m.use_backface_culling = False
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Alpha'].default_value = alpha
    if emision:
        for clave in ('Emission Color', 'Emission'):
            if clave in bsdf.inputs:
                bsdf.inputs[clave].default_value = (*emision, 1)
                break
        bsdf.inputs['Emission Strength'].default_value = fuerza
    if alpha < 1:
        m.blend_method = 'BLEND'
    return m


def caja(nombre, sx, sy, sz, cx, cy, cz, mat, rot_z=0.):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=(0, 0, rot_z))
    o = bpy.context.object
    o.name = nombre
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    return o


def cilindro(nombre, radio, alto, cx, cy, cz, mat, eje='Z', lados=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=lados, radius=radio, depth=alto, location=(cx, cy, cz))
    o = bpy.context.object
    o.name = nombre
    if eje == 'Y':
        o.rotation_euler = (math.pi / 2, 0, 0)
    elif eje == 'X':
        o.rotation_euler = (0, math.pi / 2, 0)
    o.data.materials.append(mat)
    return o


def decimar(o, ratio):
    """Reduce la densidad de triángulos conservando el aspecto a distancia de cámara."""
    modificador = o.modifiers.new('decimar', 'DECIMATE')
    modificador.ratio = ratio
    modificador.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=modificador.name)
    return o


def unir(objetos, nombre):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objetos:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objetos[0]
    bpy.ops.object.join()
    j = bpy.context.object
    j.name = nombre
    j.data.name = nombre
    bpy.context.view_layer.objects.active = j
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return j


# ---------------------------------------------------------------- escena

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
coleccion = escena.collection

# --- kit de fachada
RUTA_KIT = f'{FUENTES}/modular_urban_apartments_facade/modular_urban_apartments_facade_1k.gltf'
catalogo = {o.name: o for o in importar(RUTA_KIT) if o.type == 'MESH'}
MAT_PLASTER = bpy.data.materials['modular_urban_apartments_facade_plaster']
MAT_TRIM = bpy.data.materials['modular_urban_apartments_facade_trim_01']
MAT_OBJETOS = bpy.data.materials['modular_urban_apartments_facade_objects']
MAT_VENTANAS = bpy.data.materials['modular_urban_apartments_facade_glass']
MAT_VENTANAS.name = 'ventanas'
for m in (MAT_PLASTER, MAT_TRIM, MAT_OBJETOS, MAT_VENTANAS):
    m.use_backface_culling = False
# Sin transparencias: el vidrio queda oscuro y reflejante, y el GLB no duplica
# texturas en PNG solo por el canal alfa.
for m in (MAT_OBJETOS, MAT_VENTANAS):
    m.blend_method = 'OPAQUE'

# --- farola
farola_piezas = [o for o in importar(f'{FUENTES}/street_lamp_01/street_lamp_01_1k.gltf') if o.type == 'MESH']

# --- material de la reja: se toma del portón de hierro de Poly Haven y se descarta la malla
gate_import = [o for o in importar(f'{FUENTES}/large_iron_gate/large_iron_gate_1k.gltf') if o.type == 'MESH']
MAT_HIERRO = bpy.data.materials['large_iron_gate']
MAT_HIERRO.use_backface_culling = False
for o in gate_import:
    bpy.data.objects.remove(o, do_unlink=True)

# --- material y escala del carro
carro_piezas = [o for o in importar(f'{FUENTES}/poly-pizza/range-rover-ivofficial.glb') if o.type == 'MESH']

# --- materiales propios
MAT_CALLE = material('calle_asfalto', (.055, .055, .058), .95)
MAT_VEREDA = material('vereda_hormigon', (.42, .40, .37), .9)
MAT_CALZADA = material('entrada_hormigon', (.33, .32, .30), .88)
MAT_CESPED = material('cesped', (.055, .115, .035), 1.)
MAT_SETO = material('seto', (.035, .085, .025), .95)
MAT_POSTE = material('poste_piedra', (.30, .28, .25), .85)
MAT_HIERRO_POSTE = material('hierro_negro', (.02, .02, .022), .45, .85)
MAT_BALIZA = material('baliza', (.45, .16, .01), .3, 0., (.9, .33, .02), 3.)
MAT_LUZ = material('luz_cochera_emisiva', (.9, .85, .72), .35, 0., (1., .86, .62), 3.)
MAT_SENSOR = material('sensor_pcb', (.02, .09, .16), .55)
MAT_TRANSDUCTOR = material('sensor_transductor', (.62, .64, .66), .35, .7)
MAT_LLAVE = material('llave_metal', (.55, .57, .58), .4, .9)
MAT_MADERA = material('puerta_madera', (.16, .075, .035), .6)
MAT_TECHO = material('techo_losa', (.24, .235, .225), .9)
MAT_INTERIOR = material('interior_cochera', (.12, .12, .12), .95)
MAT_FOCO = material('foco_led', (.9, .9, .9), .2, 0., (1., 1., 1.), 2.)

# --- armado de la casa
ANCHO, PROF, PISO = 15.0, 9.0, 3.0
FRENTE = 0.0
CENTROS_X = [-6.0, -3.0, 0.0, 3.0, 6.0]
piezas_casa = []


def modulo(nombre, cx, cy, cz, giro=0.):
    origen = catalogo[nombre]
    o = origen.copy()
    o.data = origen.data.copy()
    coleccion.objects.link(o)
    centrar(o)
    o.rotation_euler = (0, 0, giro)
    o.location = (cx, cy, cz)
    piezas_casa.append(o)
    return o


# Planta baja del frente: ventanas, portón de cochera (hueco), puerta y ventanas.
planta_baja = [
    ('wall_window_centered_large_01', 'window_centered_large_01', -6.0),
    ('wall_door_centered_large_01', 'door_centered_large_01', 0.0),
    ('wall_window_centered_large_01', 'window_centered_large_01', 3.0),
    ('wall_window_centered_large_01', 'window_centered_large_01', 6.0),
]
for pared, hueco, cx in planta_baja:
    modulo(pared, cx, FRENTE, 1.5)
    modulo(hueco, cx, FRENTE + .04, 1.5)

# Planta alta del frente: cinco ventanas dobles.
for cx in CENTROS_X:
    modulo('wall_window_centered_double_01', cx, FRENTE, 4.5)
    modulo('window_centered_double_01', cx, FRENTE + .04, 4.5)

# Laterales y fondo, dos plantas.
for cz in (1.5, 4.5):
    for cy in (-1.5, -4.5, -7.5):
        modulo('wall_standard_standard_01', -ANCHO / 2, cy, cz, math.pi / 2)   # izquierda, mira a -X
        modulo('wall_standard_standard_01', ANCHO / 2, cy, cz, -math.pi / 2)   # derecha, mira a +X
    for cx in CENTROS_X:
        modulo('wall_standard_standard_01', cx, -PROF, cz, math.pi)            # fondo, mira a -Y

# Piso y techo de la casa.
piezas_casa.append(caja('losa_piso', ANCHO + .3, PROF + .3, .25, 0, -PROF / 2, -.12, MAT_TECHO))
piezas_casa.append(caja('losa_techo', ANCHO + .5, PROF + .5, .30, 0, -PROF / 2, 6.15, MAT_TECHO))
for nombre, sx, sy, cx, cy in (
    ('pretil_frente', ANCHO + .5, .35, 0, .10),
    ('pretil_fondo', ANCHO + .5, .35, 0, -PROF - .10),
    ('pretil_izq', .35, PROF + .5, -ANCHO / 2 - .07, -PROF / 2),
    ('pretil_der', .35, PROF + .5, ANCHO / 2 + .07, -PROF / 2),
):
    piezas_casa.append(caja(nombre, sx, sy, .55, cx, cy, 6.57, MAT_PLASTER))

# Dintel y jambas del portón de cochera (3 m de luz).
piezas_casa.append(caja('dintel_cochera', 3.15, .30, .55, -3.0, FRENTE + .02, 2.72, MAT_PLASTER))
piezas_casa.append(caja('jamba_izq', .18, .30, 2.5, -4.59, FRENTE + .02, 1.25, MAT_PLASTER))
piezas_casa.append(caja('jamba_der', .18, .30, 2.5, -1.41, FRENTE + .02, 1.25, MAT_PLASTER))
piezas_casa.append(caja('marco_cochera', 3.0, .06, .10, -3.0, FRENTE + .17, 2.47, MAT_TRIM))

# Cochera: caja interior oscura para que la abertura no muestre el vacío de la casa.
piezas_casa.append(caja('cochera_piso', 3.3, 6.1, .10, -3.0, -3.0, .05, MAT_CALZADA))
piezas_casa.append(caja('cochera_fondo', 3.3, .20, 3.0, -3.0, -6.05, 1.5, MAT_INTERIOR))
piezas_casa.append(caja('cochera_izq', .20, 6.1, 3.0, -4.65, -3.0, 1.5, MAT_INTERIOR))
piezas_casa.append(caja('cochera_der', .20, 6.1, 3.0, -1.35, -3.0, 1.5, MAT_INTERIOR))
piezas_casa.append(caja('cochera_techo', 3.3, 6.1, .15, -3.0, -3.0, 2.95, MAT_INTERIOR))

# Alero y escalón de la entrada.
piezas_casa.append(caja('alero', 2.6, 1.7, .16, 0, .85, 2.95, MAT_TECHO))
for x in (-1.15, 1.15):
    piezas_casa.append(cilindro('poste_alero', .07, 2.9, x, 1.55, 1.45, MAT_HIERRO_POSTE, lados=12))
piezas_casa.append(caja('escalon', 3.0, .9, .16, 0, .75, .08, MAT_VEREDA))

# --- terreno, calle y vereda
piezas_casa.append(caja('terreno', 320, 320, .20, 0, -130, -.12, MAT_CESPED))
piezas_casa.append(caja('calle', 80, 16, .12, 0, 20.2, .02, MAT_CALLE))
piezas_casa.append(caja('vereda', 80, 1.7, .16, 0, 11.15, .07, MAT_VEREDA))
piezas_casa.append(caja('cordón', 80, .18, .22, 0, 12.05, .09, MAT_VEREDA))
piezas_casa.append(caja('entrada_auto', 4.6, 10.4, .12, -3.0, 5.0, .045, MAT_CALZADA))
piezas_casa.append(caja('rampa_vereda', 4.6, 1.7, .13, -3.0, 11.15, .05, MAT_CALZADA))
piezas_casa.append(caja('cantero', 3.2, 1.1, .10, 5.2, 1.0, .02, MAT_CESPED))

# --- cerco y portón
LINEA = 10.0
for nombre, x0, x1 in (('cerco_izq', -10.5, -4.75), ('cerco_der', -1.25, 10.5)):
    largo = x1 - x0
    piezas_casa.append(caja(nombre, largo, .28, 1.55, (x0 + x1) / 2, LINEA, .78, MAT_PLASTER))
    piezas_casa.append(caja(f'{nombre}_tapa', largo + .12, .40, .10, (x0 + x1) / 2, LINEA, 1.60, MAT_TRIM))

# Setos detrás del cerco, a los dos lados del portón.
for x0, x1 in ((-10.2, -5.1), (-.9, 10.2)):
    tramo = x1 - x0
    piezas_casa.append(caja('seto', tramo, .75, 1.15, (x0 + x1) / 2, LINEA - .75, .58, MAT_SETO))

# Setos de los lotes vecinos: continúan la línea municipal a ambos lados del nuestro.
for x0, x1 in ((-34.0, -11.2), (11.2, 34.0)):
    tramo = x1 - x0
    piezas_casa.append(caja('seto_vecino', tramo, .85, 1.60, (x0 + x1) / 2, LINEA - .55, .80, MAT_SETO))

# Postes del portón.
for nombre, x in (('poste_bisagra', -1.25), ('poste_pestillo', -4.75)):
    piezas_casa.append(caja(nombre, .38, .38, 2.25, x, LINEA, 1.13, MAT_POSTE))
    piezas_casa.append(caja(f'{nombre}_tapa', .48, .48, .12, x, LINEA, 2.30, MAT_TRIM))

# --- hoja del portón, con origen en la bisagra (poste derecho) -----------------

hoja_partes = []
X_BISAGRA = -1.42          # cara interior del poste de bisagra
y_hoja = LINEA
largo_hoja = 3.20
alto_hoja = 1.95
x_fin = X_BISAGRA - largo_hoja


def barra(nombre, sx, sy, sz, cx, cy, cz):
    o = caja(nombre, sx, sy, sz, cx, cy, cz, MAT_HIERRO)
    hoja_partes.append(o)


# Marco: dos travesaños y dos montantes (la local de la hoja va de 0 a -3.20).
for z in (.15, alto_hoja - .10):
    barra('marco_h', largo_hoja, .07, .09, X_BISAGRA - largo_hoja / 2, y_hoja, z)
barra('marco_v_ext', .09, .07, alto_hoja, X_BISAGRA - .045, y_hoja, alto_hoja / 2 + .02)
barra('marco_v_int', .09, .07, alto_hoja, x_fin + .045, y_hoja, alto_hoja / 2 + .02)
# Barrotes verticales cada 12 cm.
n_barras = int(largo_hoja / .12)
for i in range(1, n_barras):
    x = X_BISAGRA - i * .12
    barra('barrote', .022, .022, alto_hoja - .14, x, y_hoja, alto_hoja / 2)
# Travesaño central y refuerzo en diagonal.
barra('travesaño', largo_hoja - .16, .05, .06, X_BISAGRA - largo_hoja / 2, y_hoja, alto_hoja * .52)
diag = caja('diagonal', math.hypot(largo_hoja - .3, alto_hoja - .5), .05, .05,
            X_BISAGRA - largo_hoja / 2, y_hoja, alto_hoja * .55, MAT_HIERRO)
diag.rotation_euler = (0, math.atan2(alto_hoja - .5, largo_hoja - .3), 0)
hoja_partes.append(diag)
# Bisagras.
for z in (.45, 1.65):
    hoja_partes.append(cilindro('bisagra', .045, .22, X_BISAGRA - .01, y_hoja, z, MAT_HIERRO, lados=12))
# Manija del lado del pestillo.
hoja_partes.append(cilindro('manija', .022, .18, x_fin + .16, y_hoja + .10, 1.05, MAT_HIERRO, eje='Y', lados=10))

hoja = unir(hoja_partes, 'porton_hoja')
# UV para la textura del hierro.
bpy.context.view_layer.objects.active = hoja
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.2, island_margin=.02)
bpy.ops.object.mode_set(mode='OBJECT')
# Origen en la bisagra.
bpy.context.scene.cursor.location = (X_BISAGRA, y_hoja, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# --- sensor HC-SR04 en el poste de bisagra, mirando a la calle --------------
sensor_partes = []
sensor_partes.append(caja('sensor_placa', .20, .035, .10, -1.25, LINEA + .20, 1.16, MAT_SENSOR))
for x in (-1.30, -1.20):
    sensor_partes.append(cilindro('sensor_ojo', .043, .05, x, LINEA + .225, 1.16, MAT_TRANSDUCTOR, eje='Y', lados=18))
sensor_partes.append(caja('sensor_rejilla', .13, .02, .055, -1.25, LINEA + .24, 1.055, MAT_HIERRO_POSTE))
sensor = unir(sensor_partes, 'sensor')

# --- baliza ámbar en la punta del poste ------------------------------------
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=.115,
                                     location=(-1.25, LINEA, 2.46))
baliza = bpy.context.object
baliza.name = 'baliza'
baliza.data.materials.append(MAT_BALIZA)
baliza.scale = (1, 1, .8)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.shade_smooth()

# --- luz de la cochera sobre el dintel -------------------------------------
luz_partes = []
luz_partes.append(caja('luz_cuerpo', .46, .16, .12, -3.0, .12, 2.86, MAT_HIERRO_POSTE))
luz_partes.append(caja('luz_vidrio', .40, .10, .06, -3.0, .18, 2.80, MAT_LUZ))
luz = unir(luz_partes, 'luz_cochera')

# --- carro -----------------------------------------------------------------
# 2026-10-21: el carro se une como antes (posiciones correctas) y después se separan las 4 ruedas por
# grupos de vértices marcados antes de unir; cada rueda queda hija del carro con el origen en su eje.
ruedas_src = [o for o in carro_piezas if o.name.startswith('Tire')]
for i, r in enumerate(ruedas_src):
    grupo = r.vertex_groups.new(name=f'rueda_{i}')
    grupo.add([v.index for v in r.data.vertices], 1.0, 'REPLACE')
carro = unir(carro_piezas, 'carro')
decimar(carro, .55)
mn, mx = bbox_mundo([carro])
largo = mx.y - mn.y
escala = 4.30 / largo
carro.scale = (escala, escala, escala)
bpy.context.view_layer.objects.active = carro
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mn, mx = bbox_mundo([carro])
# Origen al centro de la base, para ubicarlo con comodidad en Three.js.
bpy.context.scene.cursor.location = ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
ruedas = []
for i in range(len(ruedas_src)):
    bpy.ops.object.select_all(action='DESELECT')
    carro.select_set(True); bpy.context.view_layer.objects.active = carro
    carro.vertex_groups.active_index = carro.vertex_groups[f'rueda_{i}'].index
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    nueva = [o for o in bpy.context.selected_objects if o is not carro][0]
    nueva.name = nueva.data.name = f'rueda_{i}'
    bpy.ops.object.select_all(action='DESELECT')
    nueva.select_set(True); bpy.context.view_layer.objects.active = nueva
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    ruedas.append(nueva)
for r in ruedas:
    bpy.ops.object.select_all(action='DESELECT')
    r.select_set(True); carro.select_set(True); bpy.context.view_layer.objects.active = carro
    bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)
carro.location = (-3.0, 13.6, 0)

# --- farola de la vereda ---------------------------------------------------
farola = unir(farola_piezas, 'farola')
decimar(farola, .5)
mn, mx = bbox_mundo([farola])
bpy.context.scene.cursor.location = ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
farola.location = (7.6, 11.15, .15)

# --- plantas de la entrada (setos bajos en macetas) ------------------------
# DESACTIVADO 2026-10-21: maceta en (-1.75, .75), tapaba la boca de la cochera.
for x, y in ((1.75, .75), (4.2, .6), (-6.2, .55)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.28, depth=.42, location=(x, y, .21))
    maceta = bpy.context.object
    maceta.name = 'maceta'
    maceta.data.materials.append(MAT_TRIM)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=.38, location=(x, y, .62))
    mata = bpy.context.object
    mata.name = 'mata'
    mata.data.materials.append(MAT_SETO)
    mata.scale = (1, 1, .85)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    piezas_casa.extend([maceta, mata])

# --- unir la casa en una sola malla (varias ranuras de material) -----------
for o in bpy.context.selected_objects:
    o.select_set(False)
casa = unir([o for o in piezas_casa if o.name in bpy.data.objects], 'casa')
decimar(casa, .42)

# --- limpiar originales del catálogo --------------------------------------
for o in list(catalogo.values()):
    if o.name in bpy.data.objects:
        bpy.data.objects.remove(o, do_unlink=True)

# --- imágenes: todo a 512 px como máximo ----------------------------------
for img in bpy.data.images:
    if img.name == 'Render Result' or img.size[0] == 0:
        continue
    if max(img.size) > 512:
        factor = 512 / max(img.size)
        img.scale(max(1, round(img.size[0] * factor)), max(1, round(img.size[1] * factor)))

# --- exportar -------------------------------------------------------------
for o in bpy.context.selected_objects:
    o.select_set(False)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.context.view_layer.objects.active = casa
os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
argumentos = dict(filepath=SALIDA, export_format='GLB', use_selection=True, export_apply=True,
                  export_animations=False, export_cameras=False, export_lights=False,
                  export_image_format='JPEG', export_image_quality=82, export_yup=True)
try:
    bpy.ops.export_scene.gltf(**argumentos)
except TypeError as error:
    print('Ajustando opciones de exportación:', error)
    bpy.ops.export_scene.gltf(filepath=SALIDA, export_format='GLB', use_selection=True)

print('EXPORTADO', SALIDA, round(os.path.getsize(SALIDA) / 1e6, 2), 'MB')
mn, mx = bbox_mundo([casa, carro, hoja, farola])
print('ESCENA dims', [round(mx[i] - mn[i], 2) for i in range(3)], 'min', [round(v, 2) for v in mn])
print('NODOS', [(o.name, o.type) for o in bpy.data.objects if o.name in
                ('porton_hoja', 'carro', 'sensor', 'baliza', 'luz_cochera', 'casa', 'farola')])

# --- vista previa opcional -------------------------------------------------
if REVISAR:
    cam_data = bpy.data.cameras.new('Camara')
    cam = bpy.data.objects.new('Camara', cam_data)
    coleccion.objects.link(cam)
    cam.location = (11.5, 19.5, 6.4)
    objetivo = Vector((-1.0, 2.0, 2.1))
    cam.rotation_euler = (objetivo - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 40
    escena.camera = cam
    motores = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    escena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in motores else 'BLENDER_WORKBENCH'
    escena.render.resolution_x = 1280
    escena.render.resolution_y = 720
    mundo = bpy.data.worlds.new('Mundo')
    mundo.use_nodes = True
    fondo = mundo.node_tree.nodes.get('Background')
    if fondo:
        fondo.inputs[0].default_value = (.55, .62, .72, 1)
        fondo.inputs[1].default_value = 1.2
    escena.world = mundo
    sol = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN'))
    sol.data.energy = 3
    sol.rotation_euler = (math.radians(55), 0, math.radians(35))
    coleccion.objects.link(sol)
    escena.render.filepath = f'{RAIZ}/web/public/casa/_scratch/vista-casa.png'
    bpy.ops.render.render(write_still=True)
    print('VISTA', escena.render.filepath)
