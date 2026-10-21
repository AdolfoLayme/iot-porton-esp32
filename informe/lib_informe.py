# Utilidades para reconstruir el informe copiando el formato exacto del original.
import copy, re
import docx
from docx.shared import Cm
from docx.oxml.ns import qn
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


class Informe:
    def __init__(self, origen):
        self.doc = docx.Document(origen)
        self.body = self.doc.element.body
        self.orig = list(self.body.iterchildren())
        self.salida = []
        self.n_tabla = 0
        self.n_figura = 0
        self.n_fragmento = 0
        self.num_libre = 100
        # Plantillas
        self.t_normal = self.orig[20]
        self.t_lista = self.orig[28]
        self.t_rotulo = self.orig[35]
        self.t_titulo = self.orig[36]
        self.t_img = self.orig[68]
        self.t_nota = self.orig[69]
        self.t_tabla = self.orig[72]
        self.t_codigo = self.orig[125]
        self.t_ref = self.orig[307]
        self.t_h = {1: self.orig[18], 2: self.orig[19], 3: self.orig[25]}

    # --- básicos -------------------------------------------------------
    def _p_desde(self, plantilla):
        p = etree.Element(qn('w:p'))
        ppr = plantilla.find(qn('w:pPr'))
        if ppr is not None:
            p.append(copy.deepcopy(ppr))
        return p

    @staticmethod
    def _run(texto, b=False, i=False, mono=False, tam=None, sub=False):
        r = etree.Element(qn('w:r'))
        rpr = etree.SubElement(r, qn('w:rPr'))
        if mono:
            f = etree.SubElement(rpr, qn('w:rFonts'))
            for a in ('ascii', 'eastAsia', 'hAnsi', 'cs'):
                f.set(qn('w:' + a), 'Courier New')
        if b:
            etree.SubElement(rpr, qn('w:b')); etree.SubElement(rpr, qn('w:bCs'))
        if i:
            etree.SubElement(rpr, qn('w:i')); etree.SubElement(rpr, qn('w:iCs'))
        t_ = tam or (19 if mono else None)
        if t_:
            etree.SubElement(rpr, qn('w:sz')).set(qn('w:val'), str(t_))
            etree.SubElement(rpr, qn('w:szCs')).set(qn('w:val'), str(t_))
        if not len(rpr):
            r.remove(rpr)
        t = etree.SubElement(r, qn('w:t'))
        t.text = texto
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        return r

    def _texto(self, p, texto, tam=None, base_i=False):
        # **negrita**, *cursiva*, `código`
        for parte in re.split(r'(\*\*.+?\*\*|\*.+?\*|`.+?`)', texto):
            if not parte:
                continue
            if parte.startswith('**'):
                p.append(self._run(parte[2:-2], b=True, i=base_i, tam=tam))
            elif parte.startswith('`'):
                p.append(self._run(parte[1:-1], mono=True, tam=tam - 2 if tam else None))
            elif parte.startswith('*'):
                p.append(self._run(parte[1:-1], i=not base_i, tam=tam))
            else:
                p.append(self._run(parte, i=base_i, tam=tam))
        return p

    def add(self, el):
        self.salida.append(el)
        return el

    # --- bloques -------------------------------------------------------
    def h(self, nivel, texto):
        p = self._p_desde(self.t_h[nivel])
        p.append(self._run(texto))
        return self.add(p)

    def p(self, texto):
        return self.add(self._texto(self._p_desde(self.t_normal), texto))

    def lista(self, items):
        self.num_libre += 1
        self._nuevo_num(self.num_libre)
        for it in items:
            p = self._p_desde(self.t_lista)
            p.find(qn('w:pPr')).find(qn('w:numPr')).find(qn('w:numId')).set(qn('w:val'), str(self.num_libre))
            self.add(self._texto(p, it))

    def _nuevo_num(self, num_id):
        numbering = self.doc.part.numbering_part.element
        n = etree.SubElement(numbering, qn('w:num'))
        n.set(qn('w:numId'), str(num_id))
        etree.SubElement(n, qn('w:abstractNumId')).set(qn('w:val'), '5')
        o = etree.SubElement(n, qn('w:lvlOverride')); o.set(qn('w:ilvl'), '0')
        etree.SubElement(o, qn('w:startOverride')).set(qn('w:val'), '1')

    def _rotulo(self, etiqueta, titulo):
        p = self._p_desde(self.t_rotulo); p.append(self._run(etiqueta, b=True)); self.add(p)
        p = self._p_desde(self.t_titulo); self._texto(p, titulo, base_i=True); self.add(p)

    def nota(self, texto):
        p = self._p_desde(self.t_nota)
        p.append(self._run('Nota. ', i=True, tam=20))
        self._texto(p, texto, tam=20)
        return self.add(p)

    def figura(self, ruta, titulo, ancho_cm, nota=None, etiqueta=None):
        self.n_figura += 1
        self._rotulo(etiqueta or f'Figura {self.n_figura}', titulo)
        tmp = self.doc.add_paragraph()
        tmp.add_run().add_picture(ruta, width=Cm(ancho_cm))
        el = tmp._p
        el.getparent().remove(el)
        ppr = copy.deepcopy(self.t_img.find(qn('w:pPr')))
        el.insert(0, ppr)
        self.add(el)
        if nota:
            self.nota(nota)
        return self.n_figura

    def tabla(self, titulo, encabezados, filas, anchos, nota=None, etiqueta=None):
        self.n_tabla += 1
        self._rotulo(etiqueta or f'Tabla {self.n_tabla}', titulo)
        t = copy.deepcopy(self.t_tabla)
        filas_t = t.findall(qn('w:tr'))
        celda_h = copy.deepcopy(filas_t[0].findall(qn('w:tc'))[0])
        celda_b = copy.deepcopy(filas_t[1].findall(qn('w:tc'))[0])
        tr_h = copy.deepcopy(filas_t[0]); tr_b = copy.deepcopy(filas_t[1])
        for tr in filas_t:
            t.remove(tr)
        grid = t.find(qn('w:tblGrid'))
        for g in list(grid):
            grid.remove(g)
        total = sum(anchos)
        for a in anchos:
            etree.SubElement(grid, qn('w:gridCol')).set(qn('w:w'), str(a))
        t.find(qn('w:tblPr')).find(qn('w:tblW')).set(qn('w:w'), str(total))

        def fila(base_tr, base_tc, valores, negrita):
            tr = copy.deepcopy(base_tr)
            for tc in tr.findall(qn('w:tc')):
                tr.remove(tc)
            for v, a in zip(valores, anchos):
                tc = copy.deepcopy(base_tc)
                tc.find(qn('w:tcPr')).find(qn('w:tcW')).set(qn('w:w'), str(a))
                ps = tc.findall(qn('w:p'))
                for x in ps[1:]:
                    tc.remove(x)
                p0 = ps[0]
                for r in [c for c in p0 if c.tag != qn('w:pPr')]:
                    p0.remove(r)
                partes = v if isinstance(v, list) else [v]
                for k, parte in enumerate(partes):
                    pp = p0 if k == 0 else copy.deepcopy(p0)
                    if k:
                        for r in [c for c in pp if c.tag != qn('w:pPr')]:
                            pp.remove(r)
                        tc.append(pp)
                    if negrita:
                        pp.append(self._run(parte, b=True, tam=18))
                    else:
                        self._texto(pp, parte, tam=18)
                tr.append(tc)
            return tr
        t.append(fila(tr_h, celda_h, encabezados, True))
        for f in filas:
            t.append(fila(tr_b, celda_b, f, False))
        self.add(t)
        if nota:
            self.nota(nota)
        else:
            self.add(self._p_desde(self.t_normal))
        return self.n_tabla

    def codigo(self, titulo, texto, tam=15, etiqueta=True):
        if etiqueta:
            self.n_fragmento += 1
            self._rotulo(f'Fragmento {self.n_fragmento}', titulo)
        for linea in texto.rstrip('\n').split('\n'):
            p = self._p_desde(self.t_codigo)
            p.append(self._run(linea if linea else ' ', mono=True, tam=tam))
            self.add(p)
        self.add(self._p_desde(self.t_normal))

    def ref(self, texto):
        return self.add(self._texto(self._p_desde(self.t_ref), texto))

    def copiar(self, *indices):
        for i in indices:
            self.add(copy.deepcopy(self.orig[i]))

    def guardar(self, portada_hasta, ruta):
        sect = self.orig[-1]
        for el in self.orig[portada_hasta + 1:]:
            if el is not sect:
                self.body.remove(el)
        for el in self.salida:
            sect.addprevious(el)
        self.doc.save(ruta)
