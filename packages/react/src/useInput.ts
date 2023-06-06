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
} from "@uploadjoy/core/client";
import { fetchPresignedUrls, uploadFiles } from "@uploadjoy/core/client";
import { useEndpointMetadata } from "./useEndpointMetadata";
import { FileRouter } from "@uploadjoy/core/server";

type EndpointHelper<TRouter extends void | FileRouter> = void extends TRouter
  ? "YOU FORGOT TO PASS THE GENERIC"
  : keyof TRouter;

type UseInputOptions<TRouter extends void | FileRouter = void> = {
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
  readyToUpload: boolean;
  isUploading: boolean;
};

const initialState: UseInputPropsState = {
  isFileDialogActive: false,
  isFocused: false,
  acceptedFiles: [],
  errors: [],
  presignedUrls: undefined,
  readyToUpload: false,
  isUploading: false,
};

type UseInputPropsAction = {
  type:
    | "focus"
    | "blur"
    | "openDialog"
    | "closeDialog"
    | "setFiles"
    | "reset"
    | "setPresignedUrls"
    | "setIsUploading"
    | "setDoneUploading";
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
      };
    case "closeDialog":
      return { ...state, isFileDialogActive: false };
    case "setFiles":
      return {
        ...state,
        acceptedFiles: action.acceptedFiles ?? [],
        errors: action.errors ?? [],
        presignedUrls: action.presignedUrls ?? undefined,
        readyToUpload: action.readyToUpload ?? false,
      };
    case "setPresignedUrls":
      return {
        ...state,
        presignedUrls: action.presignedUrls ?? undefined,
      };
    case "setIsUploading":
      return {
        ...state,
        isUploading: true,
      };
    case "setDoneUploading":
      return {
        ...state,
        readyToUpload: false,
        isUploading: false,
      };
    case "reset":
      return {
        ...state,
        acceptedFiles: [],
        errors: [],
        presignedUrls: undefined,
        readyToUpload: false,
        isUploading: false,
      };
  }
};

const useInput = <TRouter extends void | FileRouter = void>({
  disabled = false,
  onFileDialogCancel,
  onFileDialogOpen,
  onFileDialogError,
  clientCallbacks,
  endpoint,
}: UseInputOptions<TRouter>) => {
  const permittedFileInfo = useEndpointMetadata(endpoint as string);

  const { access, config, multiple } = permittedFileInfo ?? {};

  if (!permittedFileInfo) {
    disabled = true;
  } else {
    disabled ||= false;
  }

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
  const {
    isFocused,
    isFileDialogActive,
    acceptedFiles,
    presignedUrls,
    readyToUpload,
  } = state;

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

      // TODO: client side validation

      if (fileRejections.length > 0) {
        errors.push(...fileRejections);
      }

      if (acceptedFiles.length > 0 && errors.length === 0) {
        const presignedUrls = await fetchPresignedUrls(
          acceptedFiles,
          endpoint as string,
        );

        dispatch({
          acceptedFiles,
          errors,
          presignedUrls,
          readyToUpload: true,
          type: "setFiles",
        });
        return;
      }

      dispatch({
        acceptedFiles,
        errors,
        readyToUpload: false,
        type: "setFiles",
      });
    },
    [dispatch, multiple],
  );

  const mimeTypesFromConfig = useMemo(() => {
    if (!config) {
      return;
    }
    // get the MIME types from the config
    const mimeTypes = [];
    for (const value of Object.values(config)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: fix this, acceptedFiles is not defined for blob
      const { acceptedFiles } = value;
      mimeTypes.push(...(acceptedFiles as string[]));
    }

    return mimeTypes;
  }, [config]);

  // Fn for opening the file dialog programmatically
  const openFileDialog = useCallback(() => {
    // No point to use FS access APIs if context is not secure
    // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#feature_detection
    if (fsAccessApiWorksRef.current) {
      const mimeTypes = mimeTypesFromConfig;

      if (!mimeTypes || !config) {
        // TODO: better logging
        console.error("No mime types found in config");
        return;
      }

      const acceptAll = "blob" in config;

      dispatch({ type: "openDialog" });
      onFileDialogOpenCb();
      // https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker
      const opts = {
        multiple,
        types:
          acceptAll || mimeTypes.length === 0
            ? []
            : [
                {
                  description: "Files",
                  accept: mimeTypes
                    .map((mimeType) => ({
                      [mimeType]: [],
                    }))
                    .reduce((acc, curr) => ({ ...acc, ...curr }), {}),
                },
              ],
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
        if (!config) {
          return {};
        }
        const acceptAll = "blob" in config;
        const inputProps = {
          accept: acceptAll ? "*" : mimeTypesFromConfig?.join(", "),
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
    try {
      if (access && !disabled && readyToUpload) {
        dispatch({ type: "setIsUploading" });
        await uploadFiles({
          presignedUrls,
          files: acceptedFiles,
          clientCallbacks,
          access,
        });
        dispatch({ type: "setDoneUploading" });
      }
    } catch (e) {
      // TODO: better error handling here, just reset for now
      dispatch({ type: "reset" });
    }
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
