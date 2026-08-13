-- ============================================================================
-- MUV Gimnasia Postural — v_estado_cuota_alumno_sede: agrega "medio"
-- Hace falta para que la admin pueda distinguir en la UI si la cuota
-- vigente de un alumno se pagó por Mercado Pago o se marcó a mano como
-- efectivo (paso 12). Se reescribe la vista completa (mismo filtro de
-- seguridad del paso 3 -- corre con privilegios de postgres, así que el
-- WHERE por rol/dueño es imprescindible) agregando la columna nueva AL
-- FINAL de la lista -- Postgres no permite que CREATE OR REPLACE VIEW
-- inserte una columna en el medio ("cannot change name of view column"),
-- solo agregar al final.
-- ============================================================================
create or replace view public.v_estado_cuota_alumno_sede as
select distinct on (alumno_id, sede_id)
  alumno_id,
  sede_id,
  aprobado_en,
  frecuencia_semanal,
  monto,
  vencimiento,
  case
    when vencimiento < current_date then 'vencida'
    when vencimiento <= current_date + interval '5 days' then 'por_vencer'
    else 'al_dia'
  end as estado_visual,
  medio
from public.pagos
where estado = 'aprobado'
  and (
    public.fn_current_role() = 'admin'
    or alumno_id = auth.uid()
    or public.fn_es_mi_alumno(alumno_id)
  )
order by alumno_id, sede_id, aprobado_en desc;
