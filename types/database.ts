// Tipos de la base de datos, escritos a mano a partir de
// supabase/migrations/20260810173955_initial_schema.sql.
//
// No se pudieron generar con `supabase gen types` porque este entorno no
// tiene salida de red hacia los registries de Docker (ver README). Una vez
// que el proyecto esté linkeado (`supabase link`), regenerar con:
//   npx supabase gen types typescript --linked > types/database.ts
// para tener la fuente de verdad 1:1 con la base real.
//
// "Relationships: []" en cada tabla/vista no es opcional: @supabase/postgrest-js
// exige esa propiedad (GenericTable/GenericView) para poder inferir los tipos
// de .from(...).select(...) -- sin ella, todo colapsa a "never" en tiempo de
// compilación. No se usan embeds anidados acá (los joins se hacen a mano con
// dos queries), así que queda vacío en las 12 tablas.

export type RolUsuario = "admin" | "profesor" | "alumno";
export type EstadoInscripcion = "activa" | "lista_espera" | "baja";
export type MedioPago = "mercadopago" | "efectivo";
export type EstadoPago = "pendiente" | "procesando" | "aprobado" | "rechazado";
export type EstadoAsistencia = "presente" | "ausente";
export type EstadoVisualCuota = "al_dia" | "por_vencer" | "vencida";

export type Database = {
  public: {
    Tables: {
      sedes: {
        Row: {
          id: string;
          nombre: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: RolUsuario;
          nombre: string;
          apellido: string;
          telefono: string | null;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: RolUsuario;
          nombre: string;
          apellido: string;
          telefono?: string | null;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: RolUsuario;
          nombre?: string;
          apellido?: string;
          telefono?: string | null;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profesores: {
        Row: {
          profile_id: string;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      alumnos: {
        Row: {
          profile_id: string;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      aranceles: {
        Row: {
          id: string;
          sede_id: string;
          clases_por_semana: number;
          valor_mensual: number;
          vigente_desde: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          clases_por_semana: number;
          valor_mensual: number;
          vigente_desde?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          clases_por_semana?: number;
          valor_mensual?: number;
          vigente_desde?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clases: {
        Row: {
          id: string;
          sede_id: string;
          profesor_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          cupo: number;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sede_id: string;
          profesor_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          cupo?: number;
          activa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sede_id?: string;
          profesor_id?: string;
          dia_semana?: number;
          hora_inicio?: string;
          hora_fin?: string;
          cupo?: number;
          activa?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      inscripciones: {
        Row: {
          id: string;
          alumno_id: string;
          clase_id: string;
          estado: EstadoInscripcion;
          posicion_espera: number | null;
          fecha_inscripcion: string;
          fecha_baja: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alumno_id: string;
          clase_id: string;
          estado?: EstadoInscripcion;
          posicion_espera?: number | null;
          fecha_inscripcion?: string;
          fecha_baja?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          alumno_id?: string;
          clase_id?: string;
          estado?: EstadoInscripcion;
          posicion_espera?: number | null;
          fecha_inscripcion?: string;
          fecha_baja?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pagos: {
        Row: {
          id: string;
          alumno_id: string;
          sede_id: string;
          frecuencia_semanal: number;
          monto: number;
          medio: MedioPago;
          estado: EstadoPago;
          mercadopago_payment_id: string | null;
          comprobante_url: string | null;
          marcado_por: string | null;
          marcado_en: string | null;
          /** Calculado por trigger al aprobarse el pago; no se setea a mano. */
          aprobado_en: string | null;
          /** Calculado por trigger = aprobado_en + 1 mes; no se setea a mano. */
          vencimiento: string | null;
          /** Cuándo se mandó el email de "por vencer" de este ciclo. Null = todavía no. */
          notificado_por_vencer_en: string | null;
          /** Cuándo se mandó el email de "vencida" de este ciclo. Null = todavía no. */
          notificado_vencida_en: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alumno_id: string;
          sede_id: string;
          frecuencia_semanal: number;
          monto: number;
          medio: MedioPago;
          estado?: EstadoPago;
          mercadopago_payment_id?: string | null;
          comprobante_url?: string | null;
          marcado_por?: string | null;
          marcado_en?: string | null;
          aprobado_en?: string | null;
          vencimiento?: string | null;
          notificado_por_vencer_en?: string | null;
          notificado_vencida_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alumno_id?: string;
          sede_id?: string;
          frecuencia_semanal?: number;
          monto?: number;
          medio?: MedioPago;
          estado?: EstadoPago;
          mercadopago_payment_id?: string | null;
          comprobante_url?: string | null;
          marcado_por?: string | null;
          marcado_en?: string | null;
          aprobado_en?: string | null;
          vencimiento?: string | null;
          notificado_por_vencer_en?: string | null;
          notificado_vencida_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pagos_auditoria: {
        Row: {
          id: string;
          pago_id: string;
          estado_anterior: EstadoPago | null;
          estado_nuevo: EstadoPago;
          realizado_por: string | null;
          detalle: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pago_id: string;
          estado_anterior?: EstadoPago | null;
          estado_nuevo: EstadoPago;
          realizado_por?: string | null;
          detalle?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pago_id?: string;
          estado_anterior?: EstadoPago | null;
          estado_nuevo?: EstadoPago;
          realizado_por?: string | null;
          detalle?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      asistencias: {
        Row: {
          id: string;
          clase_id: string;
          alumno_id: string;
          fecha: string;
          estado: EstadoAsistencia | null;
          tomado_por: string | null;
          tomado_en: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clase_id: string;
          alumno_id: string;
          fecha: string;
          estado?: EstadoAsistencia | null;
          tomado_por?: string | null;
          tomado_en?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clase_id?: string;
          alumno_id?: string;
          fecha?: string;
          estado?: EstadoAsistencia | null;
          tomado_por?: string | null;
          tomado_en?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      avisos: {
        Row: {
          id: string;
          titulo: string;
          mensaje: string;
          todas_las_sedes: boolean;
          fecha_inicio: string;
          fecha_fin: string;
          publicado_por: string;
          created_at: string;
          bloquea: boolean;
        };
        Insert: {
          id?: string;
          titulo: string;
          mensaje: string;
          todas_las_sedes?: boolean;
          fecha_inicio: string;
          fecha_fin: string;
          publicado_por: string;
          created_at?: string;
          bloquea?: boolean;
        };
        Update: {
          id?: string;
          titulo?: string;
          mensaje?: string;
          todas_las_sedes?: boolean;
          fecha_inicio?: string;
          fecha_fin?: string;
          publicado_por?: string;
          created_at?: string;
          bloquea?: boolean;
        };
        Relationships: [];
      };
      avisos_sedes: {
        Row: {
          aviso_id: string;
          sede_id: string;
        };
        Insert: {
          aviso_id: string;
          sede_id: string;
        };
        Update: {
          aviso_id?: string;
          sede_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_estado_cuota_alumno_sede: {
        Row: {
          alumno_id: string;
          sede_id: string;
          aprobado_en: string;
          frecuencia_semanal: number;
          monto: number;
          vencimiento: string;
          estado_visual: EstadoVisualCuota;
        };
        Relationships: [];
      };
      v_cupo_clases: {
        Row: {
          clase_id: string;
          inscriptos_activos: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      rol_usuario: RolUsuario;
      estado_inscripcion: EstadoInscripcion;
      medio_pago: MedioPago;
      estado_pago: EstadoPago;
      estado_asistencia: EstadoAsistencia;
    };
  };
};
