-- ============================================================================
-- MUV Gimnasia Postural — nuevo medio de pago "transferencia"
-- Hasta ahora, subir un comprobante (lib/alumno/comprobante-actions.ts)
-- guardaba medio='efectivo' sin importar si el alumno pagó en mano o por
-- transferencia -- se separan porque ahora "transferir por alias/CBU" es
-- una opción propia en la pantalla de pago (con sus propios datos de
-- cuenta), distinta de "la admin marca un pago en efectivo sin comprobante".
--
-- ALTER TYPE ... ADD VALUE va en su propio archivo/transacción a propósito
-- (restricción de Postgres: un valor de enum agregado no se puede usar en
-- la misma transacción en la que se agrega).
-- ============================================================================

alter type public.medio_pago add value 'transferencia';
