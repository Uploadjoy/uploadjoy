"use client";

import { useReducer } from "react";
import { noop, noopPromise } from "./utils";
import { FileRouter } from "@uploadjoy/core/server";
import {
  UseInputOptions,
  UseInputReducer,
  UseInputState,
} from "./internal/types";
import { useHelpers } from "./internal/hookUtils";

const initialState: UseInputState = {
  isFileDialogActive: false,
  isFocused: false,
  acceptedFiles: [],
  errors: [],
  presignedUrls: undefined,
  readyToUpload: false,
  isUploading: false,
};

const reducer: UseInputReducer = (state, action) => {
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isFocused } = state;

  const {
    getInputProps,
    openFileDialog,
    upload,
    reset,
    disabled: internalDisabled,
  } = useHelpers({
    endpoint,
    state,
    dispatch,
    disabled,
    clientCallbacks,
    onFileDialogCancel,
    onFileDialogOpen,
    onFileDialogError,
  });

  disabled = disabled || internalDisabled;

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
