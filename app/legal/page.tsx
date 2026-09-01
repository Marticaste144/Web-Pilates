import Link from "next/link";
import { Isotipo } from "@/components/ui/isotipo";
import { ChevronRightIcon } from "@/components/ui/icons";

export const metadata = {
  title: "Términos y Privacidad -- MUV Gimnasia Postural",
};

const H2 = "mt-7 text-base font-semibold text-neutral-900";
const P = "mt-2 text-sm leading-relaxed text-neutral-700";
const UL = "mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700";
const LINK = "font-medium text-primary-600 hover:underline";

export default function LegalPage() {
  return (
    <div className="min-h-full bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <Isotipo className="h-8 w-8 shrink-0" />
          <p className="font-semibold text-neutral-900">MUV Gimnasia Postural</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-16 sm:p-6">
        <Link href="/login" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>

        <nav className="flex flex-wrap gap-4 text-sm">
          <a href="#terminos" className={LINK}>Términos y Condiciones</a>
          <a href="#privacidad" className={LINK}>Política de Privacidad</a>
        </nav>

        {/* ==================== TÉRMINOS Y CONDICIONES ==================== */}
        <section id="terminos" className="scroll-mt-4">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Términos y Condiciones</h1>
          <p className="mt-1 text-sm text-neutral-500">
            <strong className="font-semibold text-neutral-700">MUV Gimnasia Postural</strong> -- Última actualización: 13 de
            agosto de 2026
          </p>

          <h2 className={H2}>1. Aceptación</h2>
          <p className={P}>
            Al crear una cuenta y utilizar esta plataforma, aceptás estos Términos y Condiciones y nuestra Política de
            Privacidad. Si no estás de acuerdo, no debés utilizar el sistema.
          </p>

          <h2 className={H2}>2. Servicio</h2>
          <p className={P}>
            Esta plataforma permite a los alumnos de MUV Gimnasia Postural (sedes MUV Fitness, MUV Pilates y MUV Postural)
            consultar horarios, inscribirse y darse de baja de clases, ver el estado de su cuota, y realizar pagos. Los cupos
            son limitados y se asignan por orden de inscripción, con lista de espera cuando corresponde.
          </p>

          <h2 className={H2}>3. Cuenta de usuario</h2>
          <p className={P}>
            Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta.
            Debés proporcionar datos de contacto (email) reales y mantenerlos actualizados, ya que se usan para
            notificaciones relevantes (confirmaciones, avisos de la sede, estado de cuota).
          </p>

          <h2 className={H2}>3 bis. Alumnos menores de edad</h2>
          <p className={P}>
            Los alumnos menores de 18 años pueden utilizar la plataforma únicamente con el conocimiento y consentimiento de
            su padre, madre o tutor legal, quien acepta estos Términos y la Política de Privacidad en su representación. El
            pago de la cuota y cualquier gestión asociada se entiende realizada por el adulto responsable del menor, aun
            cuando la cuenta de acceso a la plataforma esté registrada a nombre del alumno.
          </p>

          <h2 className={H2}>4. Pagos</h2>
          <p className={P}>
            Los pagos de cuota se realizan por transferencia bancaria (a los datos de cuenta/alias informados dentro de la
            plataforma) subiendo el comprobante correspondiente, o en efectivo directamente en el establecimiento. En ambos
            casos el pago lo revisa y confirma manualmente la administración -- no hay ninguna pasarela de pago automática
            ni se almacenan datos de tarjetas.
          </p>
          <p className={P}>
            Los valores de cuota, su vencimiento y las políticas de mora son las informadas dentro de la plataforma y pueden
            actualizarse; se te notificará ante cambios que te afecten.
          </p>

          <h2 className={H2}>5. Inscripciones, bajas y lista de espera</h2>
          <p className={P}>
            Podés anotarte y darte de baja de clases sujeto a la disponibilidad de cupos. Si una clase está completa, quedás
            en lista de espera y serás promovido automáticamente por orden de llegada si se libera un lugar, recibiendo una
            notificación por email.
          </p>

          <h2 className={H2}>6. Avisos y suspensión de actividad</h2>
          <p className={P}>
            El administrador puede publicar avisos que informen o, cuando corresponda, bloqueen temporalmente inscripciones,
            bajas y registro de asistencia en una o más sedes (por ejemplo, feriados o cierres excepcionales). Estos avisos
            se comunican por email a los usuarios afectados.
          </p>

          <h2 className={H2}>7. Conducta y uso aceptable</h2>
          <p className={P}>
            Te comprometés a utilizar la plataforma de forma honesta, sin intentar vulnerar su seguridad, acceder a datos de
            otros usuarios, ni utilizarla con fines distintos a la gestión de tu propia actividad en MUV Gimnasia Postural.
          </p>

          <h2 className={H2}>8. Modificaciones</h2>
          <p className={P}>
            MUV Gimnasia Postural puede modificar estos Términos en cualquier momento. Los cambios relevantes se comunicarán
            por email o mediante un aviso dentro de la plataforma.
          </p>

          <h2 className={H2}>9. Contacto</h2>
          <p className={P}>
            Ante cualquier consulta sobre estos Términos, podés escribirnos a{" "}
            <a href="mailto:castellanimartina3@gmail.com" className={LINK}>
              castellanimartina3@gmail.com
            </a>
            .
          </p>
        </section>

        <hr className="mt-8 border-neutral-200" />

        {/* ==================== POLÍTICA DE PRIVACIDAD ==================== */}
        <section id="privacidad" className="scroll-mt-4">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Política de Privacidad</h1>

          <h2 className={H2}>1. Datos que recolectamos</h2>
          <ul className={UL}>
            <li>
              <strong className="font-semibold text-neutral-900">Datos de cuenta:</strong> nombre, apellido, email,
              contraseña (almacenada de forma segura, nunca en texto plano).
            </li>
            <li>
              <strong className="font-semibold text-neutral-900">Datos de uso:</strong> clases a las que te inscribís,
              asistencia registrada por el profesor, estado de tu cuota.
            </li>
            <li>
              <strong className="font-semibold text-neutral-900">Datos de pago:</strong> el historial de pagos (monto,
              fecha, medio) queda registrado en la plataforma. No procesamos ni almacenamos datos de tarjetas: el pago se
              hace por transferencia o efectivo, y la administración lo confirma a mano.
            </li>
            <li>
              <strong className="font-semibold text-neutral-900">Comprobantes:</strong> si subís un comprobante de pago
              (imagen o PDF), se almacena de forma privada y solo es accesible por vos y por el administrador.
            </li>
          </ul>

          <h2 className={H2}>1 bis. Datos de alumnos menores de edad</h2>
          <p className={P}>
            Cuando el alumno es menor de 18 años, tratamos sus datos personales (nombre, asistencia, estado de cuota) bajo
            el consentimiento de su padre, madre o tutor legal. Recomendamos que sea el adulto responsable quien gestione la
            cuenta o esté al tanto de sus credenciales de acceso.
          </p>

          <h2 className={H2}>2. Para qué usamos tus datos</h2>
          <ul className={UL}>
            <li>Gestionar tu inscripción a clases y tu cuota.</li>
            <li>
              Enviarte notificaciones relevantes por email: confirmaciones, avisos de tu sede, recordatorios de vencimiento
              de cuota, promoción desde lista de espera.
            </li>
            <li>Que el profesor de tus clases pueda ver tu nombre y registrar tu asistencia.</li>
            <li>Que el administrador pueda gestionar el funcionamiento general del centro.</li>
          </ul>

          <h2 className={H2}>3. Con quién compartimos tus datos</h2>
          <p className={P}>
            No vendemos ni compartimos tus datos personales con terceros con fines comerciales. Compartimos información
            limitada con:
          </p>
          <ul className={UL}>
            <li>
              <strong className="font-semibold text-neutral-900">Proveedores de infraestructura técnica</strong> (hosting,
              envío de emails, almacenamiento), que actúan únicamente como proveedores de servicio y no usan tus datos con
              fines propios.
            </li>
          </ul>

          <h2 className={H2}>4. Tus derechos</h2>
          <p className={P}>
            Podés solicitar en cualquier momento acceder a tus datos, corregirlos o solicitar su eliminación, escribiendo a{" "}
            <a href="mailto:castellanimartina3@gmail.com" className={LINK}>
              castellanimartina3@gmail.com
            </a>
            . Ten en cuenta que cierta información (por ejemplo, historial de pagos) puede conservarse por obligaciones
            legales o contables aún si solicitás la baja de tu cuenta.
          </p>

          <h2 className={H2}>5. Seguridad</h2>
          <p className={P}>
            Tomamos medidas razonables para proteger tus datos (contraseñas encriptadas, acceso restringido a comprobantes y
            datos de pago). Ningún sistema es 100% infalible, pero trabajamos para mantener la plataforma segura.
          </p>

          <h2 className={H2}>6. Contacto</h2>
          <p className={P}>
            Ante cualquier consulta sobre esta Política de Privacidad, podés escribirnos a{" "}
            <a href="mailto:castellanimartina3@gmail.com" className={LINK}>
              castellanimartina3@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
