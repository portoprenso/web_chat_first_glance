/* eslint-disable */
/* prettier-ignore */

export interface AuthAuthenticate {
  type: 'auth.authenticate';
  payload: {
    accessToken: string;
  };
}


export interface ConnectionReady {
  type: 'connection.ready';
  payload: {
    userId: string;
  };
}

export interface ChatCreated {
  type: 'chat.created';
  payload: {
    chat: {
      id: string;
      createdAt: string;
      updatedAt: string;
      participant: {
        id: string;
        email: string;
        displayName: string;
      };
      lastMessage: {
        id: string;
        body: string | null;
        createdAt: string;
        senderId: string;
        attachmentCount: number;
      } | null;
    };
  };
}

export interface MessageCreated {
  type: 'message.created';
  payload: {
    message: {
      id: string;
      chatId: string;
      body: string | null;
      createdAt: string;
      sender: {
        id: string;
        email: string;
        displayName: string;
      };
      attachments: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        downloadPath: string;
        createdAt: string;
      }[];
    };
  };
}

export interface Error {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}


export interface ClientEventMap {
  'auth.authenticate': AuthAuthenticate;
}

export interface ServerEventMap {
  'connection.ready': ConnectionReady;
  'chat.created': ChatCreated;
  'message.created': MessageCreated;
  'error': Error;
}

export type ClientEvent = ClientEventMap[keyof ClientEventMap];
export type ServerEvent = ServerEventMap[keyof ServerEventMap];
