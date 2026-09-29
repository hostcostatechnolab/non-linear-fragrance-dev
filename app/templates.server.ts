import { deflateSync } from "node:zlib";

import type { authenticate } from "./shopify.server";
import { PCT_KEYS } from "./fragrance-notes.constants";

type Admin = Awaited<ReturnType<typeof authenticate.admin>>["admin"];

export type TemplateNoteInput = {
  label: string;
  colors: [string, string];
  pcts: number[];
};

const IMAGE_SIZE = 512;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Soft, organic color-field image: a lit highlight fading into the deep
 * tone, with slow swirls and fine grain so it reads as a texture rather
 * than a flat swatch when clipped into a wheel wedge.
 */
export function generateNoteImage(label: string, colors: [string, string]): Buffer {
  const light = hexToRgb(colors[0]);
  const deep = hexToRgb(colors[1]);
  const size = IMAGE_SIZE;
  let seed = seedFrom(label) || 1;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  const hx = 0.25 + rand() * 0.3;
  const hy = 0.2 + rand() * 0.3;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const dist = Math.hypot(u - hx, v - hy);
      let t = Math.max(0, 1 - dist / 0.95);
      t = t * t * (3 - 2 * t);
      t +=
        0.09 * Math.sin(u * 9 + Math.sin(v * 6 + phaseA) * 2.2) +
        0.06 * Math.sin(v * 13 + Math.cos(u * 5 + phaseB) * 1.8);
      t = Math.min(1, Math.max(0, t));
      const grain = (rand() - 0.5) * 8;
      for (let c = 0; c < 3; c++) {
        const value = deep[c] + (light[c] - deep[c]) * t + grain;
        raw[o++] = Math.min(255, Math.max(0, Math.round(value)));
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "note";
}

async function uploadNoteImages(
  admin: Admin,
  notes: TemplateNoteInput[],
): Promise<(string | null)[]> {
  const images = notes.map((n) => generateNoteImage(n.label, n.colors));

  const stagedResponse = await admin.graphql(
    `#graphql
      mutation StageTemplateImages($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        input: notes.map((n, i) => ({
          resource: "IMAGE",
          filename: `${slugify(n.label)}.png`,
          mimeType: "image/png",
          fileSize: String(images[i].length),
          httpMethod: "POST",
        })),
      },
    },
  );
  const stagedJson = await stagedResponse.json();
  const targets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[] =
    stagedJson.data?.stagedUploadsCreate?.stagedTargets ?? [];
  if (targets.length !== notes.length) return notes.map(() => null);

  await Promise.all(
    targets.map(async (target, i) => {
      const form = new FormData();
      for (const { name, value } of target.parameters) form.append(name, value);
      form.append(
        "file",
        new Blob([new Uint8Array(images[i])], { type: "image/png" }),
        `${slugify(notes[i].label)}.png`,
      );
      const res = await fetch(target.url, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Image upload failed: ${res.status}`);
    }),
  );

  const fileResponse = await admin.graphql(
    `#graphql
      mutation CreateTemplateImages($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files { id }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        files: targets.map((target, i) => ({
          contentType: "IMAGE",
          originalSource: target.resourceUrl,
          alt: notes[i].label,
        })),
      },
    },
  );
  const fileJson = await fileResponse.json();
  const files: { id: string }[] = fileJson.data?.fileCreate?.files ?? [];
  return notes.map((_, i) => files[i]?.id ?? null);
}

async function createGroup(admin: Admin, name: string): Promise<string | null> {
  const response = await admin.graphql(
    `#graphql
      mutation CreateTemplateGroup($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        metaobject: {
          type: "$app:fragrance_note_group",
          fields: [{ key: "name", value: name }],
        },
      },
    },
  );
  const json = await response.json();
  return json.data?.metaobjectCreate?.metaobject?.id ?? null;
}

export async function applyTemplate(
  admin: Admin,
  options: { notes: TemplateNoteInput[]; link: string; groupName: string | null },
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];

  const [imageIds, groupId] = await Promise.all([
    uploadNoteImages(admin, options.notes).catch((error: Error) => {
      errors.push(`Images couldn't be uploaded (${error.message}); notes were created without images.`);
      return options.notes.map(() => null);
    }),
    options.groupName ? createGroup(admin, options.groupName) : Promise.resolve(null),
  ]);

  const results = await Promise.all(
    options.notes.map(async (note, i) => {
      const fields: { key: string; value: string }[] = [
        { key: "label", value: note.label },
        { key: "link", value: options.link },
      ];
      if (imageIds[i]) fields.push({ key: "image", value: imageIds[i] as string });
      PCT_KEYS.forEach((key, k) => fields.push({ key, value: String(note.pcts[k]) }));
      if (groupId) fields.push({ key: "group", value: groupId });

      const response = await admin.graphql(
        `#graphql
          mutation CreateTemplateNote($metaobject: MetaobjectCreateInput!) {
            metaobjectCreate(metaobject: $metaobject) {
              metaobject { id }
              userErrors { field message }
            }
          }`,
        { variables: { metaobject: { type: "$app:fragrance_note", fields } } },
      );
      const json = await response.json();
      const userErrors: { message: string }[] = json.data?.metaobjectCreate?.userErrors ?? [];
      if (userErrors.length) {
        errors.push(`${note.label}: ${userErrors.map((e) => e.message).join(", ")}`);
        return false;
      }
      return true;
    }),
  );

  return { created: results.filter(Boolean).length, errors };
}
