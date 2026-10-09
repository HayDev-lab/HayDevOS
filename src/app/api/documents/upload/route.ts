import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { withTenantApi } from "@/lib/api/handler";
import { uploadDocument, uploadMetadataSchema } from "@/lib/documents";
import { toDomainContext } from "@/lib/leads/context";

export async function POST(req: NextRequest) {
  return withTenantApi(
    req,
    {
      mutation: true,
      rateLimit: { scope: "document-upload", limit: 30, windowMs: 10 * 60_000 },
    },
    async (auth) => {
      const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.startsWith("multipart/form-data;")) {
        throw new ApiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Content-Type must be multipart/form-data",
        );
      }

      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        throw new ApiError(400, "INVALID_MULTIPART_BODY", "Multipart request body is invalid");
      }

      const files = form.getAll("file");
      if (files.length !== 1 || !(files[0] instanceof File)) {
        throw new ApiError(422, "ONE_FILE_REQUIRED", "Exactly one file is required");
      }

      const rawMetadata = form.get("metadata");
      if (rawMetadata !== null && typeof rawMetadata !== "string") {
        throw new ApiError(422, "INVALID_METADATA", "Document metadata must be JSON text");
      }

      let metadataValue: unknown = {};
      if (rawMetadata) {
        try {
          metadataValue = JSON.parse(rawMetadata);
        } catch {
          throw new ApiError(422, "INVALID_METADATA", "Document metadata must be valid JSON");
        }
      }

      const metadata = uploadMetadataSchema.parse(metadataValue);
      const document = await uploadDocument(toDomainContext(auth), files[0], metadata);
      return NextResponse.json({ document }, { status: 201 });
    },
  );
}
