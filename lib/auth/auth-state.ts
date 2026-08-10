export type AuthActionState = {
  status: "idle" | "error" | "check_email";
  message: string;
};

export const initialAuthState: AuthActionState = { status: "idle", message: "" };
