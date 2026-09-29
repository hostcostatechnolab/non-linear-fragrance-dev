import { authenticate } from "./shopify.server";

type Admin = Awaited<ReturnType<typeof authenticate.admin>>["admin"];

export async function countNotes(admin: Admin): Promise<number> {
  // metaobjectDefinitionByType.metaobjectsCount is only eventually consistent
  // (observed stale by 1-2 after a delete), so it's not safe for a hard
  // limit gate. Count live edges instead — accurate, and cheap enough at
  // the note-count scale this app deals with.
  const response = await admin.graphql(`#graphql
    query FragranceNoteCount {
      metaobjects(type: "$app:fragrance_note", first: 250) {
        edges { node { id } }
      }
    }`);
  const responseJson = await response.json();
  return responseJson.data?.metaobjects?.edges?.length ?? 0;
}

/**
 * Uploads a merchant-submitted image file to Shopify's Files store and
 * returns its GID, or null if no image was submitted. This is the standard
 * three-call staged-upload flow — there is no mutation that accepts raw
 * bytes directly.
 */
export async function uploadImageIfPresent(
  admin: Admin,
  imageFile: FormDataEntryValue | null,
  altText: string,
): Promise<string | null> {
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return null;
  }

  const stagedResponse = await admin.graphql(
    `#graphql
      mutation StageFragranceImage($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        input: [
          {
            resource: "IMAGE",
            filename: imageFile.name || "fragrance-note.jpg",
            mimeType: imageFile.type || "image/jpeg",
            httpMethod: "POST",
          },
        ],
      },
    },
  );
  const stagedJson = await stagedResponse.json();
  const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) return null;

  const uploadForm = new FormData();
  for (const { name, value } of target.parameters as {
    name: string;
    value: string;
  }[]) {
    uploadForm.append(name, value);
  }
  uploadForm.append("file", imageFile, imageFile.name);

  const uploadResponse = await fetch(target.url, {
    method: "POST",
    body: uploadForm,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed: ${uploadResponse.status}`);
  }

  const fileResponse = await admin.graphql(
    `#graphql
      mutation CreateFragranceImage($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files { id }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        files: [
          {
            contentType: "IMAGE",
            originalSource: target.resourceUrl,
            alt: altText,
          },
        ],
      },
    },
  );
  const fileJson = await fileResponse.json();
  return fileJson.data?.fileCreate?.files?.[0]?.id ?? null;
}
