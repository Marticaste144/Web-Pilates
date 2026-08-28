import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import type { AsistenciasSemana, AsistenciaSemanaClase } from "./asistencias-pdf-data";

// Solo fuentes base-14 (Helvetica) -- sin registrar fuentes custom, así el
// PDF no depende de ningún archivo extra empaquetado con el deploy.
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 16 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitulo: { fontSize: 10, color: "#555555" },
  claseBloque: { marginBottom: 14 },
  claseTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  alumnoFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  estadoPresente: { fontFamily: "Helvetica-Bold", color: "#1f9d86" },
  estadoAusente: { fontFamily: "Helvetica-Bold", color: "#d1453a" },
  estadoSinTomar: { color: "#999999" },
  vacio: { fontSize: 9, color: "#999999", fontFamily: "Helvetica-Oblique" },
});

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

function textoEstado(estado: AsistenciaSemanaClase["alumnos"][number]["estado"]): string {
  if (estado === "presente") return "Presente";
  if (estado === "ausente") return "Ausente";
  return "Sin tomar";
}

function estiloEstado(estado: AsistenciaSemanaClase["alumnos"][number]["estado"]) {
  if (estado === "presente") return styles.estadoPresente;
  if (estado === "ausente") return styles.estadoAusente;
  return styles.estadoSinTomar;
}

export function AsistenciasPdfDocument({ data }: { data: AsistenciasSemana }) {
  return (
    <Document title={`Asistencias -- ${data.profesorNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Asistencias semanales</Text>
          <Text style={styles.subtitulo}>
            {data.profesorNombre} -- semana del {formatearFecha(data.lunes)} al {formatearFecha(data.domingo)}
          </Text>
        </View>

        {data.clases.length === 0 && <Text style={styles.vacio}>No tenés clases asignadas.</Text>}

        {data.clases.map((c) => (
          <View key={c.claseId} style={styles.claseBloque} wrap={false}>
            <Text style={styles.claseTitulo}>
              {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)}-{c.horaFin.slice(0, 5)} -- {c.sedeNombre} (
              {formatearFecha(c.fecha)})
            </Text>
            {c.alumnos.length === 0 ? (
              <Text style={styles.vacio}>Sin alumnos anotados.</Text>
            ) : (
              c.alumnos.map((a, i) => (
                <View key={i} style={styles.alumnoFila}>
                  <Text>
                    {a.nombre} {a.apellido}
                  </Text>
                  <Text style={estiloEstado(a.estado)}>{textoEstado(a.estado)}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
