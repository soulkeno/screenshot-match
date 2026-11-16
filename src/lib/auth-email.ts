// Accounts are username + password. Auth needs an email, so we derive a private one from the username.
export const authEmail = (u: string) => `${u.trim().toLowerCase()}@players.ember-casino.app`;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
