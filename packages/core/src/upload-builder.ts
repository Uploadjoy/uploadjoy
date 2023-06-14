import type {
  UnsetMarker,
  UploadBuilder,
  UploadBuilderDef,
  Uploader,
  AnyRuntime,
  FileRouterInputConfig,
} from "./internal/types";

function internalCreateBuilder<TRuntime extends AnyRuntime = "web">(
  initDef: Partial<UploadBuilderDef<TRuntime>> = {},
): UploadBuilder<{
  _metadata: UnsetMarker;
  _runtime: TRuntime;
}> {
  const _def: UploadBuilderDef<TRuntime> = {
    // Default router config
    routerConfig: {
      image: {
        maxFileSize: "4MB",
      },
    },
    access: "public",

    // @ts-expect-error - Ignore the temp middleware
    middleware: () => ({}),

    // Overload with properties passed in
    ...initDef,
  };

  return {
    access(access) {
      return internalCreateBuilder({
        ..._def,
        access,
      });
    },
    middleware(userMiddleware) {
      return internalCreateBuilder({
        ..._def,
        middleware: userMiddleware,
      }) as UploadBuilder<{ _metadata: any; _runtime: TRuntime }>;
    },
    onUploadComplete(userUploadComplete) {
      return {
        _def,
        resolver: userUploadComplete,
      } as Uploader<{ _metadata: any; _runtime: TRuntime }>;
    },
  };
}

type InOut<TRuntime extends AnyRuntime = "web"> = (
  input: FileRouterInputConfig,
) => UploadBuilder<{
  _metadata: UnsetMarker;
  _runtime: TRuntime;
}>;

export function createBuilder<
  TRuntime extends AnyRuntime = "web",
>(): InOut<TRuntime> {
  return (input: FileRouterInputConfig) => {
    return internalCreateBuilder<TRuntime>({ routerConfig: input });
  };
}
