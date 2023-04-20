import type { DragEvent, SyntheticEvent } from "react";
import { validateFilename } from "@uploadjoy/uploader-common";

type FilenameExtension = `.${string}`;
type MimeTypes =
  | "application"
  | "audio"
  | "font"
  | "image"
  | "message"
  | "model"
  | "multipart"
  | "text"
  | "video";

// Unfortunately, Typescript does not have a way to check of a nonempty string, so "image/" is valid as a type but not as an actual MIME type
type MimeString = `${MimeTypes}/${string}`;

type MimeTypesWithWildcard = `${MimeTypes}/*`;

/** Valid values for the accept attribute of an input element
https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept#unique_file_type_specifiers */
export type AcceptAttr = (
  | MimeTypesWithWildcard
  | MimeString
  | FilenameExtension
)[];

export type AcceptProp = Record<
  MimeString | MimeTypesWithWildcard,
  FilenameExtension[]
>;

/**
 * Custom validation function for files, returns true if the file is valid
 */
export type FileValidator = (
  file: File,
) => { code: string; message: string } | undefined;

// Error codes
export const ErrorCodes = {
  DragAndDropError: "drag-and-drop-error",
  FileTooLarge: "file-too-large",
  FileTooSmall: "file-too-small",
  InvalidFileType: "invalid-file-type",
  FileNameInvalid: "file-name-invalid",
  TooManyFiles: "too-many-files",
  PresignedUrlFetchError: "presigned-url-fetch-error",
  UploadError: "upload-error",
} as const;

type ErrorCodesType = typeof ErrorCodes;

export type UploaderError = {
  code: ErrorCodesType[keyof ErrorCodesType];
  message: string;
};

export const getInvalidFileTypeRejectionError = (
  accept: AcceptAttr,
): UploaderError => {
  return {
    code: "invalid-file-type",
    message: `Invalid file type. Only ${accept.join(", ")} are allowed.`,
  };
};

export const getTooLargeFileRejectionError = (maxSize: number) => {
  return {
    code: "file-too-large",
    message: `File too large. Maximum size allowed is ${maxSize} bytes.`,
  } as const;
};

export const getTooSmallFileRejectionError = (minSize: number) => {
  return {
    code: "file-too-small",
    message: `File too small. Minimum size allowed is ${minSize} bytes.`,
  } as const;
};

export const getTooManyFilesRejectionError = (maxFiles: number) => {
  return {
    code: "too-many-files",
    message: `Too many files. Maximum allowed is ${maxFiles}.`,
  } as const;
};

export const fileTypeIsAcceptable = (
  acceptable: AcceptAttr | undefined,
  file: File,
  acceptAll: boolean,
): boolean => {
  // If acceptAll is true, all files are acceptable
  // escape hatch for obscure file types
  if (acceptAll || !acceptable) {
    return true;
  }

  const fileName = file.name || "";
  const fileType = file.type || "";
  const baseMimeType = fileType.replace(/\/.*$/, "");

  // Firefox versions prior to 53 return a bogus MIME type for every file drag, so dragovers with that MIME type will always be accepted
  if (fileType === "application/x-moz-file") return true;

  return acceptable.some((type) => {
    const validType = type.trim().toLowerCase();

    if (validType.charAt(0) === ".") {
      return fileName.toLowerCase().endsWith(validType);
    } else if (validType.endsWith("/*")) {
      // This is something like a image/* mime type
      return baseMimeType === validType.replace(/\/.*$/, "");
    }
    return fileType === validType;
  });
};

export const fileSizeIsAcceptable = (
  file: File,
  minSize: number | undefined,
  maxSize: number | undefined,
) => {
  if (minSize && file.size < minSize) {
    return getTooSmallFileRejectionError(minSize);
  }

  if (maxSize && file.size > maxSize) {
    return getTooLargeFileRejectionError(maxSize);
  }

  return true;
};

export const validateFile = (
  file: File,
  accept: AcceptAttr | undefined,
  acceptAll: boolean,
  minSize: number | undefined,
  maxSize: number | undefined,
  customValidator: FileValidator | undefined,
) => {
  const result: {
    file: File;
    errors: { code: string; message: string }[];
  } = { file, errors: [] };

  if (customValidator) {
    const customValidatorError = customValidator(file);
    if (customValidatorError) {
      result.errors.push(customValidatorError);
    }
  }

  const fileNameParseResult = validateFilename(file.name);

  if (!fileNameParseResult.success) {
    result.errors.push({
      code: "file-name-invalid",
      message: fileNameParseResult.errorMessage,
    });
  }

  if (!fileTypeIsAcceptable(accept, file, acceptAll)) {
    result.errors.push(getInvalidFileTypeRejectionError(accept as any));
  }

  const fileSizeIsAcceptableResult = fileSizeIsAcceptable(
    file,
    minSize,
    maxSize,
  );

  if (fileSizeIsAcceptableResult !== true) {
    result.errors.push(fileSizeIsAcceptableResult);
  }

  return result;
};

export const allFilesAreAcceptable = (
  files: File[],
  accept: AcceptAttr,
  acceptAll: boolean,
  minSize: number | undefined,
  maxSize: number | undefined,
  customValidator: FileValidator | undefined,
  maxFiles = 1,
  multiple: boolean,
) => {
  if (
    (!multiple && files.length > 1) ||
    (multiple && maxFiles >= 1 && files.length > maxFiles)
  ) {
    return false;
  }

  return files.every(
    (file) =>
      validateFile(file, accept, acceptAll, minSize, maxSize, customValidator)
        .errors.length === 0,
  );
};

// React's synthetic events has event.isPropagationStopped,
export const isPropagationStopped = (event: SyntheticEvent) => {
  if (typeof event.isPropagationStopped === "function") {
    return event.isPropagationStopped();
  }
  return false;
};

export const isEventWithFiles = (event: DragEvent) => {
  if (!event.dataTransfer) {
    // cast to HTMLInputElement to access files property
    return !!event.target && !!(event.target as HTMLInputElement).files;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
  // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file
  return Array.prototype.some.call(
    event.dataTransfer.types,
    (type) => type === "Files" || type === "application/x-moz-file",
  );
};

// allow the entire document to be a drag target
export const onDocumentDragOver = (event: DragEvent) => {
  event.preventDefault();
};

export const isEdge = (userAgent: Navigator["userAgent"]) => {
  return userAgent.indexOf("Edge") > -1;
};

/**
 * This is intended to be used to compose event handlers
 * They are executed in order until one of them calls `event.isPropagationStopped()`.
 * Note that the check is done on the first invoke too,
 * meaning that if propagation was stopped before invoking the fns,
 * no handlers will be executed.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function composeEventHandlers(...fns: Function[]): Function {
  return (event: SyntheticEvent, ...args: any[]) =>
    fns.some((fn) => {
      if (!isPropagationStopped(event) && fn) {
        fn(event, ...args);
      }
      return isPropagationStopped(event);
    });
}

/**
 * canUseFileSystemAccessAPI checks if the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
 * is supported by the browser.
 */
export function canUseFileSystemAccessAPI(): boolean {
  return "showOpenFilePicker" in window;
}

/**
 * Convert the `{accept}` dropzone prop to the
 * `{types}` option for https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker
 */
export function pickerOptionsFromAccept(accept: AcceptProp | null | undefined) {
  if (accept !== null && accept !== undefined) {
    const acceptForPicker = Object.entries(accept)
      .filter(([mimeType, ext]) => {
        let ok = true;

        if (!isMIMEType(mimeType)) {
          console.warn(
            `Skipped "${mimeType}" because it is not a valid MIME type. Check https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types for a list of valid MIME types.`,
          );
          ok = false;
        }

        if (!Array.isArray(ext) || !ext.every(isExt)) {
          console.warn(
            `Skipped "${mimeType}" because an invalid file extension was provided.`,
          );
          ok = false;
        }

        return ok;
      })
      .reduce(
        (agg, [mimeType, ext]) => ({
          ...agg,
          [mimeType]: ext,
        }),
        {},
      );
    return [
      {
        // description is required due to https://crbug.com/1264708
        description: "Files",
        accept: acceptForPicker,
      },
    ];
  }
  return accept;
}

/**
 * Convert the `{accept}` dropzone prop to an array of MIME types/extensions.
 */
export function acceptPropAsAcceptAttr(
  accept: AcceptProp | null | undefined,
): AcceptAttr | undefined {
  if (accept === null || accept === undefined) {
    return undefined;
  }

  const keys = Object.keys(accept);
  if (keys.length === 0) {
    return undefined;
  }

  const attr: AcceptAttr = [];

  for (const key of keys) {
    if (isMIMEType(key)) {
      attr.push(key as any);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      for (const ext of accept[key as any]!) {
        if (isExt(ext)) {
          attr.push(ext);
        }
      }
    }
  }

  return attr;
}

/**
 * Check if v is an exception caused by aborting a request (e.g window.showOpenFilePicker()).
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/DOMException.
 */
export function isAbort(v: any) {
  return (
    v instanceof DOMException &&
    (v.name === "AbortError" || v.code === v.ABORT_ERR)
  );
}

/**
 * Check if v is a security error.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/DOMException.
 */
export function isSecurityError(v: any) {
  return (
    v instanceof DOMException &&
    (v.name === "SecurityError" || v.code === v.SECURITY_ERR)
  );
}

/**
 * Check if v is a MIME type string.
 *
 * See accepted format: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers.
 *
 * @param {string} v
 */
export function isMIMEType(v: string) {
  return (
    v === "audio/*" ||
    v === "video/*" ||
    v === "image/*" ||
    v === "text/*" ||
    /\w+\/[-+.\w]+/g.test(v)
  );
}

/**
 * Check if v is a file extension.
 * @param {string} v
 */
export function isExt(v: string) {
  return /^.*\.[\w]+$/.test(v);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}

export function noopPromise() {
  return Promise.resolve();
}
