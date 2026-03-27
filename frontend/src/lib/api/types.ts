import type { paths } from '../../generated/api-types';

type Operation<Path extends keyof paths, Method extends keyof paths[Path]> = NonNullable<
  paths[Path][Method]
>;

type Responses<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends {
    responses: infer T;
  }
    ? T
    : never;

export type JsonRequest<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends {
    requestBody?: {
      content: {
        'application/json': infer T;
      };
    };
  }
    ? T
    : never;

export type MultipartRequest<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends {
    requestBody?: {
      content: {
        'multipart/form-data': infer T;
      };
    };
  }
    ? T
    : never;

export type PathParams<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends {
    parameters?: {
      path: infer T;
    };
  }
    ? T
    : never;

export type QueryParams<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends {
    parameters?: {
      query: infer T;
    };
  }
    ? T
    : never;

export type JsonResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends keyof Responses<Path, Method>,
> = Responses<Path, Method>[Status] extends {
  content: {
    'application/json': infer T;
  };
}
  ? T
  : never;
