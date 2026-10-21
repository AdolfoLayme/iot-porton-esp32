// Modo seguro: cuenta en Supabase (solo por invitación) → llave MQTT temporal de flespi.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Credencial } from './modos';

export type Rol = 'admin' | 'miembro';
export type Llave = Credencial & { rol: Rol; token: string; vence: number };
export type FilaHistorial = { ts: string; user_id: string; orden: string; resultado: string; motivo: string };
export type Miembro = { user_id: string; nombre: string; rol: Rol; activo: boolean };

export const modoSeguro = import.meta.env.VITE_MODO !== 'abierto';
const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
let cliente: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (!URL_SB || !ANON) throw new Error('Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
  return cliente ??= createClient(URL_SB, ANON);
}

/** Milisegundos hasta pedir la llave nueva: `margenMs` antes de que venza, nunca negativo. */
export const renovarAntesDe = (vence: number, margenMs: number, ahora = Date.now()) => Math.max(0, vence - margenMs - ahora);

export async function entrar(email: string, clave: string): Promise<void> {
  const { error } = await sb().auth.signInWithPassword({ email, password: clave });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
}
export async function haySesion(): Promise<boolean> {
  return !!(await sb().auth.getSession()).data.session;
}
export async function salir(): Promise<void> { await sb().auth.signOut(); }

async function funcion<T>(nombre: string, cuerpo: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb().functions.invoke(nombre, { body: cuerpo });
  if (error) {
    // El cuerpo del error trae el mensaje en español que escribe la función.
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detalle?.error ?? 'No se pudo contactar al servidor.');
  }
  return data as T;
}

export async function pedirLlave(): Promise<Llave> {
  const r = await funcion<{ token: string; vence: number; base: string; usuarioId: string; nombre: string; rol: Rol; url: string }>('llave-mqtt');
  return { modo: 'seguro', ...r };
}

export const gestionarMiembros = <T>(cuerpo: Record<string, unknown>) => funcion<T>('miembros', cuerpo);

export async function leerHistorial(limite = 50): Promise<FilaHistorial[]> {
  const { data, error } = await sb().from('historial').select('ts,user_id,orden,resultado,motivo').order('ts', { ascending: false }).limit(limite);
  if (error) throw new Error('No se pudo leer el historial.');
  return data;
}

/** Orden libre por voz (texto o audio base64) → orden MQTT validada por la función `voz` (Gemini). */
export const entenderVoz = (cuerpo: { texto: string } | { audio: string; mime: string }) =>
  funcion<{ orden: string | null; respuesta: string | null }>('voz', cuerpo);
