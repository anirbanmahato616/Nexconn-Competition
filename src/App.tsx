
import { NCEngine } from '@nexconn/chat';
import type { ServiceHooks } from '@nexconn/chatui';
import {
  NCChatUIApplication,
} from '@nexconn/chatui';

import { useEffect, useRef, useState } from 'react';

let connectionPromise: Promise<string> | null = null;

function connectToNexconn(): Promise<string> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const appKey = import.meta.env.VITE_NEXCONN_APP_KEY;

      const userId =
        new URLSearchParams(window.location.search).get('user') === '2'
          ? '2'
          : '1';

      const token =
        userId === '2'
          ? import.meta.env.VITE_NEXCONN_USER_2_TOKEN
          : import.meta.env.VITE_NEXCONN_TEST_TOKEN;

      if (!appKey || !token) {
        throw new Error('Missing Nexconn credentials');
      }

      // Initialize Nexconn Engine
      NCEngine.initialize({ appKey });

      // Temporary hooks for testing
      const hooks: ServiceHooks = {
        reqUserProfiles: async () => [],
        reqGroupProfiles: async () => [],
        reqSystemProfiles: async () => [],
        reqGroupMembers: async () => [],
      };

      // Initialize ChatUI
      const chatApp = NCChatUIApplication.initialize({
        hooks,
        language: 'en_US',
      });

      if (!chatApp) {
        throw new Error('ChatUI initialization failed');
      }

      // Register ChatUI custom elements
      chatApp.ready();

      console.log(
        'ChatUI provider:',
        customElements.get('nc-chat-ui-app-provider')
      );

      // Connect selected user
      const result = await NCEngine.connect({ token });

      if (result.code !== 0) {
        throw new Error(`Connection failed: ${result.code}`);
      }

      return userId;
    })();
  }

  return connectionPromise;
}

function App() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('Connecting to Nexconn...');

  const chatRootRef = useRef<HTMLDivElement>(null);

  // Connect to Nexconn
  useEffect(() => {
    let active = true;

    connectToNexconn()
      .then(id => {
        if (!active) return;

        setUserId(id);
        setStatus(`Connected as User ${id}`);
      })
      .catch(error => {
        if (active) {
          setStatus(
            `Error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Mount ChatUI after initialization
  useEffect(() => {
    if (!userId || !chatRootRef.current) return;

    const provider = document.createElement(
      'nc-chat-ui-app-provider'
    );

    chatRootRef.current.replaceChildren(provider);

    console.log('ChatUI provider mounted');

    return () => {
      chatRootRef.current?.replaceChildren();
    };
  }, [userId]);

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        padding: 20,
      }}
    >
      <h2>RecoverX Chat</h2>

      <p>{status}</p>

      {userId && (
        <p>Logged in as User {userId}</p>
      )}

      <div
        ref={chatRootRef}
        id="chatui-root"
        style={{
          height: '75vh',
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

export default App;
