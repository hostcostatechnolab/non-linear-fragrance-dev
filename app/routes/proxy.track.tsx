import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { getPlan } from "../plan.server";
import db from "../db.server";

const NO_CONTENT = () => new Response(null, { status: 204 });

export const loader = async () => NO_CONTENT();

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return NO_CONTENT();

  const plan = await getPlan(session.shop);
  if (plan !== "pro") return NO_CONTENT();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NO_CONTENT();
  }

  // Liquid's metaobject `.system.id`/`.system.handle` (and reference GIDs)
  // can come through as JSON numbers rather than strings depending on the
  // field, so coerce rather than requiring typeof === "string".
  const asString = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string" && typeof value !== "number") return null;
    return String(value).slice(0, 255);
  };

  const noteGid = asString(body.gid);
  if (!noteGid) return NO_CONTENT();

  await db.clickEvent.create({
    data: {
      shop: session.shop,
      noteGid,
      noteHandle: asString(body.handle),
      noteLabel: asString(body.label),
      groupGid: asString(body.group),
      groupLabel: asString(body.groupLabel),
      blockId: asString(body.blockId),
    },
  });

  return NO_CONTENT();
};
