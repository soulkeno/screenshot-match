/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Obj = Record<string, any>;

export const playInstantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game: string; wager: number; params?: Obj }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.playInstant(context.userId, data.game, data.wager, data.params);
  });

export const sessionStartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game: string; wager: number; params?: Obj }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.sessionStart(context.userId, data.game, data.wager, data.params);
  });

export const sessionActionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game: string; action: string; params?: Obj }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.sessionAction(context.userId, data.game, data.action, data.params);
  });

export const sessionResumeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.sessionResume(context.userId, data.game);
  });

export const getFairnessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.getFairness(context.userId);
  });

export const rotateSeedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientSeed?: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.rotateSeed(context.userId, data.clientSeed);
  });

export const pvpCreateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: string; params: Obj }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.pvpCreate(context.userId, data.kind, data.params);
  });

export const pvpJoinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.pvpJoin(context.userId, data.id);
  });

export const pvpCancelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.pvpCancel(context.userId, data.id);
  });

export const duelRevealFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; tile: number }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.duelReveal(context.userId, data.id, data.tile);
  });

export const duelClaimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.duelClaim(context.userId, data.id);
  });

export const changeUsernameFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.changeUsername(context.userId, data.username);
  });

export const adminWipeUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string }) => d)
  .handler(async ({ data, context }): Promise<any> => {
    const E = await import("./engine.server");
    return E.adminWipeUser(context.userId, data.targetUserId);
  });
