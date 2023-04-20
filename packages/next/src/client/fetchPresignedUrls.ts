import { GetPresignedUrlOpts } from "@uploadjoy/uploader-common";
import { externalApiPutObjectApiOutputSchema } from "@uploadjoy/uploader-common";

export const fetchPresignedUrls = async ({
  files,
  folder,
  fileAccess,
}: GetPresignedUrlOpts) => {
  try {
    const response = await fetch("/api/uploadjoy/presignedUrls/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files, folder, fileAccess }),
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch presigned URLs \n
        Status: ${response.status} \n
        Body: ${await response.json()}`,
      );
      return;
    }

    const data = await response.json();

    const parseResult = externalApiPutObjectApiOutputSchema.safeParse(data);
    if (!parseResult.success) {
      console.error(
        `Failed to parse presigned URL response \n
        ${parseResult.error.issues.toString()}`,
      );
      return;
    }

    return parseResult.data;
  } catch (error) {
    console.error(error);
  }
};
