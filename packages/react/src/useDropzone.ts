"use client";

import {
  ChangeEventHandler,
  HTMLProps,
  Reducer,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { fromEvent } from "file-selector";
import {
  composeEventHandlers,
  noop,
  UploaderError,
  noopPromise,
  isEvtWithFiles,
  isPropagationStopped,
  canUseFileSystemAccessAPI,
  isAbort,
  isSecurityError,
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

function onDocumentDragOver(event: any) {
  event.preventDefault();
}

type UseDropzoneOptions<TRouter extends void | FileRouter = void> = {
  /**
   * Sets the `disabled` attribute on the input element.
   * @default false
   */
  disabled?: boolean;

  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogError?: (error: Error) => void;

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

type UseDropzonePropsState = {
  isFileDialogActive: boolean;
  isDragActive: boolean;
  isFocused: boolean;
  acceptedFiles: File[];
  errors: InputError[];
  presignedUrls?: Awaited<ReturnType<typeof fetchPresignedUrls>>;
  readyToUpload: boolean;
  isUploading: boolean;
};

const initialState: UseDropzonePropsState = {
  isFileDialogActive: false,
  isDragActive: false,
  isFocused: false,
  acceptedFiles: [],
  errors: [],
  presignedUrls: undefined,
  readyToUpload: false,
  isUploading: false,
};

type UseDropzonePropsAction = {
  type:
    | "focus"
    | "blur"
    | "setFiles"
    | "reset"
    | "openDialog"
    | "closeDialog"
    | "setPresignedUrls"
    | "setIsUploading"
    | "setDoneUploading"
    | "setDragActive";
} & Partial<UseDropzonePropsState>;

const reducer: Reducer<UseDropzonePropsState, UseDropzonePropsAction> = (
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
    case "setDragActive":
      return { ...state, isDragActive: action.isDragActive ?? false };
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

const useDropzone = <TRouter extends void | FileRouter = void>({
  disabled = false,
  clientCallbacks,
  endpoint,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileDialogCancel,
  onFileDialogOpen,
  onFileDialogError,
}: UseDropzoneOptions<TRouter>) => {
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

  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    isFocused,
    isFileDialogActive,
    readyToUpload,
    acceptedFiles,
    presignedUrls,
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

  const dragTargetsRef = useRef([]);

  const onDocumentDrop = (event: any) => {
    if (rootRef.current && rootRef.current.contains(event.target)) {
      // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
      return;
    }
    event.preventDefault();
    dragTargetsRef.current = [];
  };

  useEffect(() => {
    document.addEventListener("dragover", onDocumentDragOver, false);
    document.addEventListener("drop", onDocumentDrop, false);

    return () => {
      document.removeEventListener("dragover", onDocumentDragOver);
      document.removeEventListener("drop", onDocumentDrop);
    };
  }, [rootRef]);

  const onDragEnterCb = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      (event as unknown as SyntheticEvent).persist();

      dispatch({ type: "setDragActive", isDragActive: true });
      if (onDragEnter) {
        onDragEnter(event);
      }
    },
    [onDragEnter],
  );

  const onDragOverCb = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      (event as unknown as SyntheticEvent).persist();

      const hasFiles = isEvtWithFiles(event);
      if (hasFiles && onDragOver) {
        onDragOver(event);
      }
    },
    [onDragOver],
  );

  const onDragLeaveCb = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      (event as unknown as SyntheticEvent).persist();
      // Only deactivate once the dropzone and all children have been left
      const targets = dragTargetsRef.current.filter(
        (target) => rootRef.current && rootRef.current.contains(target),
      );
      // Make sure to remove a target present multiple times only once
      // (Firefox may fire dragenter/dragleave multiple times on the same element)

      const targetIdx = (targets as any[]).indexOf(event.target);
      if (targetIdx !== -1) {
        targets.splice(targetIdx, 1);
      }
      dragTargetsRef.current = targets;
      if (targets.length > 0) {
        return;
      }

      dispatch({ type: "setDragActive", isDragActive: false });
      if (isEvtWithFiles(event) && onDragLeave) {
        onDragLeave(event);
      }
    },
    [rootRef, onDragLeave],
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

  const onDropCb = useCallback(
    (event: any) => {
      event.preventDefault();
      // Persist here because we need the event later after getFilesFromEvent() is done
      event.persist();

      dragTargetsRef.current = [];

      if (isEvtWithFiles(event)) {
        Promise.resolve(fromEvent(event))
          .then(async (files) => {
            if (isPropagationStopped(event)) {
              return;
            }

            const acceptedFiles = files.map((file) => {
              if ((file as DataTransferItem).getAsFile) {
                const dtFile = (file as DataTransferItem).getAsFile();
                if (dtFile) {
                  return dtFile;
                }
              }

              return file as File;
            });
            await setFiles(acceptedFiles);

            if (onDrop) {
              onDrop(acceptedFiles, event);
            }
          })
          .catch((error) => {
            console.error(error);
            dispatch({ type: "reset" });
          });
      }
    },
    [setFiles],
  );

  // Cb to open the file dialog when SPACE/ENTER occurs on the dropzone
  const onKeyDownCb = useCallback(
    (event: any) => {
      // Ignore keyboard events bubbling up the DOM tree
      if (!rootRef.current || !rootRef.current.isEqualNode(event.target)) {
        return;
      }

      if (
        event.key === " " ||
        event.key === "Enter" ||
        event.keyCode === 32 ||
        event.keyCode === 13
      ) {
        event.preventDefault();
        openFileDialog();
      }
    },
    [rootRef, openFileDialog],
  );

  // Update focus state for the dropzone
  const onFocusCb = useCallback(() => {
    dispatch({ type: "focus" });
  }, []);
  const onBlurCb = useCallback(() => {
    dispatch({ type: "blur" });
  }, []);

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

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeHandler = (fn: Function) => {
    return disabled ? noop : fn;
  };

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeKeyboardHandler = (fn: Function) => {
    return composeHandler(fn);
  };

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeDragHandler = (fn: Function) => {
    return composeHandler(fn);
  };

  const getRootProps = useMemo(
    () =>
      ({
        refKey = "ref",
        role,
        onKeyDown,
        onFocus,
        onBlur,
        onDragEnter,
        onDragOver,
        onDragLeave,
        onDrop,
        ...rest
      }: // TODO: fix any cast
      any = {}) => ({
        onKeyDown: composeKeyboardHandler(
          composeEventHandlers(onKeyDown, onKeyDownCb),
        ),
        onFocus: composeKeyboardHandler(
          composeEventHandlers(onFocus, onFocusCb),
        ),
        onBlur: composeKeyboardHandler(composeEventHandlers(onBlur, onBlurCb)),
        onDragEnter: composeDragHandler(
          composeEventHandlers(onDragEnter, onDragEnterCb),
        ),
        onDragOver: composeDragHandler(
          composeEventHandlers(onDragOver, onDragOverCb),
        ),
        onDragLeave: composeDragHandler(
          composeEventHandlers(onDragLeave, onDragLeaveCb),
        ),
        onDrop: composeDragHandler(composeEventHandlers(onDrop, onDropCb)),
        role: typeof role === "string" && role !== "" ? role : "presentation",
        [refKey]: rootRef,
        ...(!disabled ? { tabIndex: 0 } : {}),
        ...rest,
      }),
    [
      rootRef,
      onKeyDownCb,
      onFocusCb,
      onBlurCb,
      onDragEnterCb,
      onDragOverCb,
      onDragLeaveCb,
      onDropCb,
      disabled,
    ],
  );

  const getInputProps = useMemo(
    () =>
      ({ onChange, ...rest }: HTMLProps<HTMLInputElement> = {}) => {
        if (!config) {
          return {
            accept: "",
            multiple,
            type: "file",
            style: { display: "none" },
            onChange: noop as ChangeEventHandler<HTMLInputElement>,
            tabIndex: -1,
            ref: inputRef,
            ...rest,
          };
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
    getDropzoneRootProps: getRootProps,
    upload: disabled ? noopPromise : upload,
    openFileDialog: disabled ? noop : openFileDialog,
    reset,
  };
};

export { useDropzone };
