// Role w backendzie od najniższej: user < admin < staff < owner. Rolę można nadać tylko niższą od własnej
// (reguły egzekwuje backend; tu tylko nazwy i kolejność, żeby interfejs nie pokazywał rzeczy niedozwolonych).
export const ROLES = ["user", "admin", "staff", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (x: unknown): x is Role => ROLES.includes(x as Role);
/** Ranga roli (0 = user); nieznana nazwa daje -1, czyli mniej niż każda prawdziwa rola. */
export const rank = (role: string): number => ROLES.indexOf(role as Role);

export const ROLE_PL: Record<Role, string> = { user: "Użytkownik", admin: "Administrator", staff: "Staff", owner: "Właściciel" };

// Lustro reguł z backendu (accounts/policy.py), żeby interfejs nie pokazywał rzeczy niedozwolonych. Rozstrzyga i tak backend (403).
export const isAdminLevel = (role: string) => rank(role) >= rank("admin");
/** Zarządzać można tylko kontami niższymi od własnego (siebie i równych sobie nie). */
export const canManage = (actor: Role, target: Role) => rank(target) < rank(actor);
/** Nadać można tylko rolę niższą od własnej; ownera nie da się nadać wcale. */
export const grantableRoles = (actor: Role): Role[] => ROLES.filter((r) => rank(r) < rank(actor));
