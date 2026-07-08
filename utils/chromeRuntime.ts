import type { ExtensionRequest, ExtensionResponse } from './messages';

type RuntimeError = {
  message?: string;
};

type MessageSender = unknown;

type ChromeRuntime = {
  runtime: {
    lastError?: RuntimeError;
    sendMessage(
      request: ExtensionRequest,
      callback: (response: ExtensionResponse | undefined) => void,
    ): void;
    onMessage: {
      addListener(
        listener: (
          message: ExtensionRequest,
          sender: MessageSender,
          sendResponse: (response: ExtensionResponse) => void,
        ) => true | undefined,
      ): void;
    };
  };
};

declare const chrome: ChromeRuntime;

export function sendRuntimeMessage(request: ExtensionRequest): Promise<ExtensionResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response ?? { body: null });
    });
  });
}

export function addRuntimeMessageListener(
  handler: (message: ExtensionRequest) => Promise<ExtensionResponse>,
) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handler(message).then(sendResponse);
    return true;
  });
}
