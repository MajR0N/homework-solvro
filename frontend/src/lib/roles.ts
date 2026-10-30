// Role w backendzie od najniższej: user < admin < staff < owner. Rolę można nadać tylko niższą od własnej
// (reguły egzekwuje backend; tu tylko nazwy i kolejność, żeby interfejs nie pokazywał rzeczy niedozwolonych).
export const ROLES = ["user", "admin", "staff", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (x: unknown): x is Role => ROLES.includes(x as Role);
/** Ranga roli (0 = user); nieznana nazwa daje -1, czyli mniej niż każda prawdziwa rola. */
export const rank = (role: string): number => ROLES.indexOf(role as Role);

export const ROLE_PL: Record<Role, string> = { user: "Użytkownik", admin: "Administrator", staff: "Staff", owner: "Właściciel" };
