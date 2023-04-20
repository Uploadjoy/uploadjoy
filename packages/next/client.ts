"use client";

import {
  ChangeEventHandler,
  HTMLProps,
  MouseEventHandler,
  Reducer,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { fromEvent } from "file-selector";
import {
  acceptPropAsAcceptAttr,
  composeEventHandlers,
  canUseFileSystemAccessAPI,
  isAbort,
  isSecurityError,
  pickerOptionsFromAccept,
  AcceptProp,
  FileValidator,
  noop,
  UploaderError,
  validateFile,
  noopPromise,
} from "./src/client/utils";
import {
  externalApiPutObjectApiOutputSchema as presignedUrlFetchResponseSchema,
  validateFolder,
} from "@uploadjoy/uploader-common";
import { z } from "zod";
import {
  ClientUploadCallback,
  ClientUploadProgressCallback,
  submit,
} from "./src/client/submit";
import { fetchPresignedUrls } from "./src/client/fetchPresignedUrls";

type UseInputProps = {
  /**
   * Record of MIME types and file extensions to accept.
   *
   * This prop is used to define the `accept` attribute in the input element, and the `accept` option in the file picker.
   *
   * @example { "image/*": [".png", ".jpg", ".jpeg"] }
   * @example { "video/*": [".mp4"] }
   */
  accept?: AcceptProp;
  /**
   *  Set to `true` to accept all files regardless of the `accept` prop.
   *  @default false
   */
  acceptAll?: boolean;
  /**
   * Set to `true` to allow multiple files to be selected.
   * @default true
   */
  multiple?: boolean;
  /**
   * Sets the `disabled` attribute on the input element.
   * @default false
   */
  disabled?: boolean;
  /**
   *
   * User defined validator function to validate files before presigned URLs are fetched.
   * @returns undefined` if the file is valid. Otherwise, an error object with a `code` and `message` property.
   */
  validator?: FileValidator;
  /**
   * Minimum file size in bytes.
   */
  minSize?: number;
  /**
   * Maximum file size in bytes.
   */
  maxSize?: number;
  /**
   * Maximum number of files allowed to be selected by the user.
   */
  maxFiles?: number;
  /**
   * File access mode. `public` files are accessible by anyone with the Uploadjoy CDN URL. `private` files are accessible by presigned URLs.
   * @default "private"
   */
  fileAccess: "public" | "private";
  /**
   * Folder to upload files to.
   *
   * @example "my-folder/my-subfolder/"
   */
  folder?: string;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogError?: (error: Error) => void;

  /**
   * Callbacks for client-side upload progress and success/error events.
   * These callbacks are run on the client only. They are useful for updating   the UI with the state of te upload, e.g. toasting on success or error.
   */
  clientCallbacks?: {
    onUploadProgress?: ClientUploadProgressCallback;
    onUploadSuccess?: ClientUploadCallback;
    onUploadError?: ClientUploadCallback;
  };
};

type FileRejectionError = {
  type: "file-rejection-error";
  file: File;
  errors: (UploaderError | { code: string; message: string })[];
};

type InputError =
  | {
      type: "folder-name-error";
      message: string;
    }
  | FileRejectionError;

type UseInputPropsState = {
  isFileDialogActive: boolean;
  isFocused: boolean;
  acceptedFiles: File[];
  errors: InputError[];
  presignedUrls?: z.infer<typeof presignedUrlFetchResponseSchema>;
};

const initialState: UseInputPropsState = {
  isFileDialogActive: false,
  isFocused: false,
  acceptedFiles: [],
  errors: [],
  presignedUrls: undefined,
};

type UseInputPropsAction = {
  type:
    | "focus"
    | "blur"
    | "openDialog"
    | "closeDialog"
    | "setFiles"
    | "reset"
    | "setPresignedUrls";
} & Partial<UseInputPropsState>;

const reducer: Reducer<UseInputPropsState, UseInputPropsAction> = (
  state,
  action,
) => {
  switch (action.type) {
    case "focus":
      return { ...state, isFocused: true };
    case "blur":
      return { ...state, isFocused: false };
    case "openDialog":
      // Reset the state when the dialog is opened
      return {
        ...state,
        isFileDialogActive: true,
        acceptedFiles: [],
        errors: [],
        presignedUrls: undefined,
        uploadProgress: undefined,
      };
    case "closeDialog":
      return { ...state, isFileDialogActive: false };
    case "setFiles":
      return {
        ...state,
        acceptedFiles: action.acceptedFiles ?? [],
        errors: action.errors ?? [],
        presignedUrls: action.presignedUrls ?? undefined,
      };
    case "setPresignedUrls":
      return {
        ...state,
        presignedUrls: action.presignedUrls ?? undefined,
      };
    case "reset":
      return {
        ...state,
        acceptedFiles: [],
        errors: [],
        presignedUrls: undefined,
      };
  }
};

const useInput = ({
  acceptAll = false,
  disabled = false,
  maxSize = Infinity,
  minSize = 0,
  maxFiles = 1,
  multiple = false,
  validator,
  accept,
  onFileDialogCancel,
  onFileDialogOpen,
  onFileDialogError,
  fileAccess = "private",
  folder,
  clientCallbacks,
}: UseInputProps) => {
  const acceptAttr = useMemo(() => acceptPropAsAcceptAttr(accept), [accept]);
  const pickerTypes = useMemo(() => pickerOptionsFromAccept(accept), [accept]);

  const onFileDialogOpenCb = useMemo(
    () => (typeof onFileDialogOpen === "function" ? onFileDialogOpen : noop),
    [onFileDialogOpen],
  );
  const onFileDialogCancelCb = useMemo(
    () =>
      typeof onFileDialogCancel === "function" ? onFileDialogCancel : noop,
    [onFileDialogCancel],
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { isFocused, isFileDialogActive, acceptedFiles, presignedUrls } = state;

  const fsAccessApiWorksRef = useRef(
    typeof window !== "undefined" &&
      window.isSecureContext &&
      canUseFileSystemAccessAPI(),
  );

  // Update file dialog active state when the window is focused on
  const onWindowFocus = () => {
    // Execute the timeout only if the file dialog is opened in the browser
    if (!fsAccessApiWorksRef.current && isFileDialogActive) {
      setTimeout(() => {
        if (inputRef.current) {
          const { files } = inputRef.current;

          if (!files || files.length === 0) {
            dispatch({ type: "closeDialog" });
            onFileDialogCancelCb();
          }
        }
      }, 300);
    }
  };

  useEffect(() => {
    window.addEventListener("focus", onWindowFocus, false);
    return () => {
      window.removeEventListener("focus", onWindowFocus, false);
    };
  }, [inputRef, isFileDialogActive, onFileDialogCancelCb, fsAccessApiWorksRef]);

  const onFileDialogErrCb = useCallback(
    (e: Error) => {
      if (onFileDialogError) {
        onFileDialogError(e);
      } else {
        // Let the user know something's gone wrong if they haven't provided the onError cb.
        console.error(e);
      }
    },
    [onFileDialogError],
  );

  const setFiles = useCallback(
    async (files: File[]) => {
      const errors: InputError[] = [];
      const acceptedFiles: File[] = [];
      const fileRejections: FileRejectionError[] = [];

      if (folder) {
        const folderValidationResult = validateFolder(folder);

        if (!folderValidationResult.success) {
          errors.push({
            type: "folder-name-error",
            message: folderValidationResult.errorMessage,
          });
        }
      }

      files.forEach((file) => {
        const { file: maybeValidatedFile, errors } = validateFile(
          file,
          acceptAttr,
          acceptAll,
          minSize,
          maxSize,
          validator,
        );

        if (errors.length === 0) {
          acceptedFiles.push(maybeValidatedFile);
        } else {
          fileRejections.push({
            type: "file-rejection-error",
            file: maybeValidatedFile,
            errors,
          });
        }
      });

      if (
        (!multiple && acceptedFiles.length > 1) ||
        (multiple && maxFiles >= 1 && acceptedFiles.length > maxFiles)
      ) {
        // Reject everything and empty accepted files
        acceptedFiles.forEach((file) => {
          fileRejections.push({
            type: "file-rejection-error",
            file,
            errors: [
              {
                code: "too-many-files",
                message: `Too many files. Maximum allowed is ${maxFiles}.`,
              },
            ],
          });
        });
        acceptedFiles.splice(0);
      }

      if (fileRejections.length > 0) {
        errors.push(...fileRejections);
      }

      if (acceptedFiles.length > 0 && errors.length === 0) {
        const presignedUrls = await fetchPresignedUrls({
          files: acceptedFiles.map(({ name, size, type }) => ({
            name,
            size,
            type,
          })),
          fileAccess,
          folder: folder ?? "",
        });

        dispatch({
          acceptedFiles,
          errors,
          presignedUrls,
          type: "setFiles",
        });
        return;
      }

      dispatch({
        acceptedFiles,
        errors,
        type: "setFiles",
      });
    },
    [dispatch, multiple, acceptAttr, minSize, maxSize, maxFiles, validator],
  );

  // Fn for opening the file dialog programmatically
  const openFileDialog = useCallback(() => {
    // No point to use FS access APIs if context is not secure
    // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#feature_detection
    if (fsAccessApiWorksRef.current) {
      dispatch({ type: "openDialog" });
      onFileDialogOpenCb();
      // https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker
      const opts = {
        multiple,
        types: pickerTypes ?? undefined,
      };
      // any's needed to avoid TS error in build, idk why
      (window as any)
        .showOpenFilePicker(opts)
        .then((handles: any) => fromEvent(handles))
        .then(async (files: any) => {
          await setFiles(files as File[]);
          dispatch({ type: "closeDialog" });
        })
        .catch((e: Error) => {
          // AbortError means the user canceled
          if (isAbort(e)) {
            onFileDialogCancelCb();
            dispatch({ type: "closeDialog" });
          } else if (isSecurityError(e)) {
            fsAccessApiWorksRef.current = false;
            // CORS, so cannot use this API
            // Try using the input
            if (inputRef.current) {
              inputRef.current.value = "";
              inputRef.current.click();
            } else {
              onFileDialogErrCb(
                new Error(
                  "Cannot open the file picker because the https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API is not supported and no <input> was provided.",
                ),
              );
            }
          } else {
            onFileDialogErrCb(e);
          }
        });
      return;
    }
    if (inputRef.current) {
      dispatch({ type: "openDialog" });
      onFileDialogOpenCb();
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }, [
    dispatch,
    onFileDialogOpenCb,
    onFileDialogCancelCb,
    setFiles,
    onFileDialogErrCb,
    pickerTypes,
    multiple,
  ]);

  const onInputElementClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeHandler = (fn: Function) => {
    return disabled ? noop : fn;
  };

  const getInputProps = useMemo(
    () =>
      ({ onChange, onClick, ...rest }: HTMLProps<HTMLInputElement> = {}) => {
        const inputProps = {
          accept: acceptAttr ? acceptAttr.join(",") : "",
          multiple,
          type: "file",
          style: { display: "none" },
          onChange: composeHandler(
            composeEventHandlers(onChange ?? noop),
          ) as ChangeEventHandler<HTMLInputElement>,
          onClick: composeHandler(
            composeEventHandlers(onClick ?? noop, onInputElementClick),
          ) as MouseEventHandler<HTMLInputElement>,
          tabIndex: -1,
          ref: inputRef,
        };

        return {
          ...inputProps,
          ...rest,
        };
      },
    [inputRef, accept, multiple, disabled],
  );

  const uploadFiles = useCallback(async () => {
    if (!presignedUrls) {
      console.log("No presigned URLs, cannot upload files");
      return;
    }
    await submit({
      acceptedFiles,
      presignedUrls,
      fileAccess,
      clientCallbacks,
    });

    // TODO better error handling here, just reset for now
    dispatch({ type: "reset" });
  }, [acceptedFiles, presignedUrls, submit]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, [dispatch]);

  return {
    ...state,
    isFocused: isFocused && !disabled,
    getInputProps,
    openFileDialog: disabled ? noop : openFileDialog,
    uploadFiles: disabled ? noopPromise : uploadFiles,
    reset,
  };
};

export { useInput };
