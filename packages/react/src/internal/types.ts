import { FileRouter } from "@uploadjoy/core/server";
import type {
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
  fetchPresignedUrls,
} from "@uploadjoy/core/client";
import { Dispatch, Reducer } from "react";

export type EndpointHelper<TRouter extends void | FileRouter> =
  void extends TRouter ? "YOU FORGOT TO PASS THE GENERIC" : keyof TRouter;

export type UseInputOptions<TRouter extends void | FileRouter = void> = {
  /**
   * Sets the `disabled` attribute on the input element.
   * @default false
   */
  disabled?: boolean;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogError?: (error: Error) => void;

  endpoint: EndpointHelper<TRouter>;

  /**
   * Callbacks for client-side upload progress and success/error events.
   * These callbacks are run on the client only. They are useful for updating   the UI with the state of te upload, e.g. toasting on success or error.
   */
  clientCallbacks?: {
    onUploadProgress?: ClientOnUploadProgressCallback;
    onUploadSuccess?: ClientOnUploadCallback;
    onUploadError?: ClientOnUploadFailureCallback;
  };
};

export type UseDropzoneOptions<TRouter extends void | FileRouter = void> =
  UseInputOptions<TRouter> & {
    /**
     * Cb for when the `dragenter` event occurs.
     */
    onDragEnter?: (event: DragEvent) => void;

    /**
     * Cb for when the `dragleave` event occurs
     */
    onDragLeave?: (event: DragEvent) => void;

    /**
     * Cb for when the `dragover` event occurs
     */
    onDragOver?: (event: DragEvent) => void;

    /**
     * Cb for when the `drop` event occurs
     */
    onDrop?: (files: File[], event: DragEvent | Event) => void;
  };

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

export type FileRejectionError = {
  type: "file-rejection-error";
  file: File;
  errors: (UploaderError | { code: string; message: string })[];
};

export type InputError =
  | {
      type: "folder-name-error";
      message: string;
    }
  | FileRejectionError;

export type UseInputState = {
  isFileDialogActive: boolean;
  isFocused: boolean;
  acceptedFiles: File[];
  errors: InputError[];
  presignedUrls?: Awaited<ReturnType<typeof fetchPresignedUrls>>;
  readyToUpload: boolean;
  isUploading: boolean;
};

export type UseDropzoneState = UseInputState & {
  isDragActive: boolean;
};

type UseInputActionTypes =
  | "focus"
  | "blur"
  | "openDialog"
  | "closeDialog"
  | "setFiles"
  | "reset"
  | "setPresignedUrls"
  | "setIsUploading"
  | "setDoneUploading";

type UseDropzoneActionTypes = UseInputActionTypes | "setDragActive";

type UseInputAction = {
  type: UseInputActionTypes;
} & Partial<UseInputState>;

type UseDropzoneAction = {
  type: UseDropzoneActionTypes;
} & Partial<UseDropzoneState>;

export type UseInputReducer = Reducer<UseInputState, UseInputAction>;

export type UseDropzoneReducer = Reducer<UseDropzoneState, UseDropzoneAction>;

export type UseInputDispatch = Dispatch<
  {
    type: UseInputActionTypes;
  } & Partial<UseInputState>
>;

export type UseDropzoneDispatch = Dispatch<
  {
    type: UseDropzoneActionTypes;
  } & Partial<UseDropzoneState>
>;
