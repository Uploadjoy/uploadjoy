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
  composeEventHandlers,
  canUseFileSystemAccessAPI,
  isAbort,
  isSecurityError,
  noop,
  UploaderError,
  noopPromise,
} from "./utils";
import type {
  ClientOnUploadCallback,
  ClientOnUploadFailureCallback,
  ClientOnUploadProgressCallback,
} from "uploadjoy/client";
import { fetchPresignedUrls, uploadFiles } from "uploadjoy/client";
import { useEndpointMetadata } from "./useEndpointMetadata";

type UseInputOptions<T extends string> = {
  /**
   * Sets the `disabled` attribute on the input element.
   * @default false
   */
  disabled?: boolean;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogError?: (error: Error) => void;

  endpoint: T;

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
  presignedUrls?: Awaited<ReturnType<typeof fetchPresignedUrls>>;
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

const useInput = <T extends string>({
  disabled = false,
  onFileDialogCancel,
  onFileDialogOpen,
  onFileDialogError,
  clientCallbacks,
  endpoint,
}: UseInputOptions<T>) => {
  const permittedFileInfo = useEndpointMetadata(endpoint);

  if (!permittedFileInfo) {
    throw new Error(
      `useInput: No permitted file info found for endpoint ${endpoint}`,
    );
  }

  const { access, maxSize, maxFiles, fileTypes } = permittedFileInfo;

  const multiple = maxFiles !== 1;

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
      const acceptedFiles: File[] = files;
      const fileRejections: FileRejectionError[] = [];

      if (
        (!multiple && acceptedFiles.length > 1) ||
        (multiple &&
          maxFiles &&
          maxFiles >= 1 &&
          acceptedFiles.length > maxFiles)
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
        const presignedUrls = await fetchPresignedUrls(acceptedFiles, endpoint);

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
    [dispatch, multiple, maxSize, maxFiles],
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
        types: fileTypes ?? undefined,
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
    fileTypes,
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
          // TODO:  get proper accept string
          accept: undefined,
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
    [inputRef, multiple, disabled],
  );

  const upload = useCallback(async () => {
    if (!presignedUrls) {
      console.log("No presigned URLs, cannot upload files");
      return;
    }
    await uploadFiles({
      presignedUrls,
      files: acceptedFiles,
      clientCallbacks,
      access,
    });

    // TODO better error handling here, just reset for now
    dispatch({ type: "reset" });
  }, [acceptedFiles, presignedUrls]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, [dispatch]);

  return {
    ...state,
    isFocused: isFocused && !disabled,
    getInputProps,
    openFileDialog: disabled ? noop : openFileDialog,
    upload: disabled ? noopPromise : upload,
    reset,
  };
};

export { useInput };
