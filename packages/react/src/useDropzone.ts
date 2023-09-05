"use client";

import {
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
  noopPromise,
  isEvtWithFiles,
  isPropagationStopped,
} from "./utils";
import { FileRouter } from "@uploadjoy/core/server";
import {
  UseDropzoneOptions,
  UseDropzoneReducer,
  UseDropzoneState,
} from "./internal/types";
import { useHelpers } from "./internal/hookUtils";

function onDocumentDragOver(event: any) {
  event.preventDefault();
}

const initialState: UseDropzoneState = {
  isFileDialogActive: false,
  isDragActive: false,
  isFocused: false,
  acceptedFiles: [],
  errors: [],
  presignedUrls: undefined,
  readyToUpload: false,
  isUploading: false,
};

const reducer: UseDropzoneReducer = (state, action) => {
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
  autoUpload,
}: UseDropzoneOptions<TRouter>) => {
  const rootRef = useRef<HTMLElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { isFocused } = state;

  const {
    getInputProps,
    openFileDialog,
    upload,
    reset,
    disabled: internalDisabled,
    setFiles,
    composeHandler,
  } = useHelpers<TRouter>({
    clientCallbacks,
    endpoint,
    dispatch,
    state,
    onFileDialogCancel,
    onFileDialogError,
    onFileDialogOpen,
    disabled,
    autoUpload,
  });

  disabled = disabled || internalDisabled;

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

  return {
    ...state,
    isFocused: isFocused && !disabled,
    getInputProps,
    getDropzoneRootProps: getRootProps,
    upload: disabled || autoUpload ? noopPromise : upload,
    openFileDialog: disabled ? noop : openFileDialog,
    reset,
  };
};

export { useDropzone };
