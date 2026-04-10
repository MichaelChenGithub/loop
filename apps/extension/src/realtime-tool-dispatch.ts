import {
  GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE,
  type GetLatestCodeSnapshotResponse
} from "./code-snapshot";
import {
  buildCurrentCodeContextToolOutput,
  buildEmptyCurrentCodeContextToolOutput,
  type CurrentCodeContextToolOutput
} from "./background";

export type RealtimeToolSuccessResult = CurrentCodeContextToolOutput;

export type RealtimeToolFailureResult = {
  ok: false;
  error: string;
};

export type RealtimeToolResult =
  | RealtimeToolSuccessResult
  | RealtimeToolFailureResult;

export type RealtimeToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type RealtimeToolDispatcher = {
  dispatch(call: RealtimeToolCall): Promise<RealtimeToolResult>;
};

export const readCurrentCodeContextFromBackground = async ({
  runtime = chrome.runtime
}: {
  runtime?: Pick<typeof chrome.runtime, "sendMessage">;
} = {}): Promise<CurrentCodeContextToolOutput> => {
  const response = (await runtime.sendMessage({
    type: GET_LATEST_CODE_SNAPSHOT_MESSAGE_TYPE
  })) as GetLatestCodeSnapshotResponse;

  if (!response.snapshot) {
    return buildEmptyCurrentCodeContextToolOutput();
  }

  return buildCurrentCodeContextToolOutput(response.snapshot);
};

export const createRealtimeToolDispatcher = ({
  readCurrentCodeContext = readCurrentCodeContextFromBackground
}: {
  readCurrentCodeContext?: () => Promise<CurrentCodeContextToolOutput>;
} = {}): RealtimeToolDispatcher => ({
  async dispatch({ name }: RealtimeToolCall): Promise<RealtimeToolResult> {
    if (name === "get_current_code_context") {
      return readCurrentCodeContext();
    }

    return {
      ok: false,
      error: `Unknown tool: ${name}`
    };
  }
});
