"use client";
/**
 * This file contains common util functions and hooks used by the useInput and useDropzone hooks.
 */

import {
  ChangeEventHandler,
  HTMLProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  EndpointHelper,
  FileRejectionError,
  InputError,
  UseDropzoneDispatch,
  UseDropzoneState,
  UseInputDispatch,
  UseInputOptions,
  UseInputState,
} from "./types";
import { fetchPresignedUrls, uploadFiles } from "@uploadjoy/core/client";
import { FileRouter } from "@uploadjoy/core/server";
import {
  canUseFileSystemAccessAPI,
  composeEventHandlers,
  getMimeTypesFromConfig,
  isAbort,
  isSecurityError,
  noop,
  noopPromise,
} from "../utils";
import { fromEvent } from "file-selector";
import { useEndpointMetadata } from "../useEndpointMetadata";

export function useHelpers<TRouter extends void | FileRouter = void>({
  endpoint,
  onFileDialogCancel,
  onFileDialogOpen,
  dispatch,
  state,
  onFileDialogError,
  disabled,
  clientCallbacks,
  autoUpload,
}: {
  endpoint: EndpointHelper<TRouter>;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogError?: (e: Error) => void;
  dispatch: UseInputDispatch | UseDropzoneDispatch;
  state: UseInputState | UseDropzoneState;
  disabled: boolean;
  clientCallbacks: UseInputOptions["clientCallbacks"];
  autoUpload?: boolean;
}) {
  const { isFileDialogActive, readyToUpload, acceptedFiles, presignedUrls } =
    state;

  const permittedFileInfo = useEndpointMetadata(endpoint as string);

  const { access, config, multiple } = permittedFileInfo ?? {};

  if (!permittedFileInfo) {
    disabled = true;
  } else {
    disabled ||= false;
  }

  const mimeTypesFromConfig = useMemo(() => {
    if (!config) {
      return;
    }
    return getMimeTypesFromConfig(config);
  }, [config]);

  const onFileDialogOpenCb = useMemo(
    () => (typeof onFileDialogOpen === "function" ? onFileDialogOpen : noop),
    [onFileDialogOpen],
  );
  const onFileDialogCancelCb = useMemo(
    () =>
      typeof onFileDialogCancel === "function" ? onFileDialogCancel : noop,
    [onFileDialogCancel],
  );
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

  const inputRef = useRef<HTMLInputElement>(null);

  const fsAccessApiWorksRef = useRef(
    typeof window !== "undefined" &&
      window.isSecureContext &&
      canUseFileSystemAccessAPI(),
  );

  // Update file dialog active state when the window is focused on
  const onWindowFocus = useCallback(() => {
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
  }, []);

  useEffect(() => {
    window.addEventListener("focus", onWindowFocus, false);
    return () => {
      window.removeEventListener("focus", onWindowFocus, false);
    };
  }, [inputRef, isFileDialogActive, onFileDialogCancelCb, fsAccessApiWorksRef]);

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
        });
        dispatch({ type: "setDoneUploading" });
      }
    } catch (e) {
      // TODO: better error handling here, just reset for now
      dispatch({ type: "reset" });
    }
  }, [acceptedFiles, presignedUrls]);

  // autoUpload if autoUpload is true and setFiles has been called
  useEffect(() => {
    if (autoUpload && readyToUpload) {
      upload();
    }
  }, [state.readyToUpload]);

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
    [dispatch],
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

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeHandler = (fn: Function) => {
    return disabled ? noop : fn;
  };

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

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, [dispatch]);

  return {
    getInputProps,
    openFileDialog: disabled ? noop : openFileDialog,
    upload: disabled ? noopPromise : upload,
    reset,
    disabled,
    setFiles,
    composeHandler,
  };
}
