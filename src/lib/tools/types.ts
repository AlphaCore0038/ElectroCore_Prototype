export type ToolSuccess<T> = {
  ok: true;
  data: T;
};

export type ToolError = {
  ok: false;
  error: string;
  message: string;
};

export type ToolResult<T> = ToolSuccess<T> | ToolError;
