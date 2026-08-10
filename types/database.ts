// Placeholder de tipos de la base de datos. En el paso 2 (modelo de datos)
// esto se reemplaza por el archivo generado con:
//   npx supabase gen types typescript --project-id <id> > types/database.ts
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
