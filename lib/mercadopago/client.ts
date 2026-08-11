import { MercadoPagoConfig } from "mercadopago";

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en .env.local");
  }

  return new MercadoPagoConfig({ accessToken });
}
