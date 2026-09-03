-- ============================================================================
-- MUV Gimnasia Postural — Clases: profesor "pendiente de cuenta"
--
-- La grilla real de horarios (ver migración siguiente) incluye profesores
-- confirmados por nombre que TODAVÍA no tienen cuenta de acceso al sistema
-- (invitarlos requiere un email real de cada uno -- decisión explícita del
-- negocio: no se inventan emails ni se tocan auth.users a mano). Sin este
-- cambio no se podría cargar ni un solo horario de esas personas, porque
-- clases.profesor_id es NOT NULL y referencia profesores -> profiles ->
-- auth.users.
--
-- Se relaja profesor_id a nullable y se agrega profesor_pendiente_nombre
-- (texto libre, ej. "Rocío") para esos casos -- una clase siempre tiene que
-- identificar a SU profesor de alguna manera (constraint: una de las dos
-- columnas, nunca ninguna, nunca las dos). Cuando Admin invite a la persona
-- real más adelante (flujo normal de /admin/profesores), solo hace falta
-- editar esa clase puntual y asignarle el profesor_id real -- no hace falta
-- ningún cambio de esquema nuevo para eso.
-- ============================================================================

alter table public.clases
  alter column profesor_id drop not null;

alter table public.clases
  add column profesor_pendiente_nombre text;

alter table public.clases
  add constraint chk_clases_profesor_identificado check (
    (profesor_id is not null and profesor_pendiente_nombre is null)
    or (profesor_id is null and profesor_pendiente_nombre is not null)
  );

comment on column public.clases.profesor_pendiente_nombre is
  'Nombre del profesor real confirmado que todavía no tiene cuenta de acceso -- null en cuanto profesor_id se completa con la cuenta real (Admin la asigna a mano desde /admin/clases cuando esa persona sea invitada).';
