export const shouldShowCodeCaptureDebugAction = (
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean => nodeEnv !== "production";
