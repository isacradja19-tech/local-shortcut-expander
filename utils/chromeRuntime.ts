import {
  isExtensionRequest,
  type ExtensionRequest,
  type ExtensionResponse,
  type ResponseFor,
} from './messages';

type RuntimeError = {
  message?: string;
};

export type MessageSender = {
  tab?: { id?: number; url?: string };
  frameId?: number;
  url?: string;
};

type ChromeTab = {
  id?: number;
  url?: string;
};

type ChromeApi = {
  runtime: {
    /** `undefined` après un rechargement de l'extension : le contexte est mort. */
    id?: string;
    lastError?: RuntimeError;
    sendMessage(
      request: ExtensionRequest,
      callback: (response: ExtensionResponse | undefined) => void,
    ): void;
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: ExtensionResponse) => void,
        ) => true | undefined,
      ): void;
    };
  };
  /** Absent dans un content script. */
  tabs?: {
    query(queryInfo: Record<string, unknown>, callback: (tabs: ChromeTab[]) => void): void;
    sendMessage(
      tabId: number,
      request: ExtensionRequest,
      callback: (response: ExtensionResponse | undefined) => void,
    ): void;
  };
};

declare const chrome: ChromeApi | undefined;

/**
 * Faux dans deux cas fréquents :
 *  - frame sandboxée / `about:blank` sans accès à l'API,
 *  - extension rechargée pendant que la page était ouverte ("context invalidated").
 * Sans ce garde, chaque frappe lève une exception dans le content script.
 */
export function isExtensionContextValid(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

function requireChrome(): ChromeApi {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
    throw new Error('Contexte d’extension invalide.');
  }

  return chrome;
}

export function sendRuntimeMessage<TRequest extends ExtensionRequest>(
  request: TRequest,
): Promise<ResponseFor<TRequest>> {
  return new Promise((resolve, reject) => {
    let api: ChromeApi;

    try {
      api = requireChrome();
    } catch (error) {
      reject(error);
      return;
    }

    api.runtime.sendMessage(request, (response) => {
      // `lastError` doit être lu à l'intérieur du callback, sinon Chrome le signale.
      const error = api.runtime.lastError;

      if (error) {
        reject(new Error(error.message ?? `Échec de l’envoi de ${request.type}.`));
        return;
      }

      if (response === undefined) {
        reject(new Error(`Aucune réponse pour ${request.type}.`));
        return;
      }

      resolve(response as ResponseFor<TRequest>);
    });
  });
}

/**
 * Background uniquement. Les onglets sans content script (`chrome://`, Web Store,
 * nouvel onglet) renvoient "Receiving end does not exist" : on l'absorbe.
 */
export function broadcastToTabs(request: ExtensionRequest): Promise<void> {
  return new Promise((resolve) => {
    const api = requireChrome();
    const tabs = api.tabs;

    if (!tabs) {
      resolve();
      return;
    }

    tabs.query({}, (openTabs) => {
      void api.runtime.lastError;

      for (const tab of openTabs) {
        if (tab.id === undefined) {
          continue;
        }

        // Sans `frameId`, le message atteint toutes les frames de l'onglet.
        tabs.sendMessage(tab.id, request, () => {
          void api.runtime.lastError;
        });
      }

      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Réception
// ---------------------------------------------------------------------------

export type ExtensionMessageHandler = (
  message: ExtensionRequest,
  sender: MessageSender,
) => Promise<ExtensionResponse>;

export function addRuntimeMessageListener(handler: ExtensionMessageHandler): void {
  const api = requireChrome();

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Renvoyer `undefined` laisse les autres listeners répondre.
    if (!isExtensionRequest(message)) {
      return undefined;
    }

    void handler(message, sender).then(sendResponse, (error: unknown) => {
      console.error(`[snippets] ${message.type} a échoué`, error);
      sendResponse({ body: null });
    });

    // `true` garde le canal ouvert pour une réponse asynchrone.
    return true;
  });
}
