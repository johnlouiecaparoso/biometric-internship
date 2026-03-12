const textEncoder = new TextEncoder();

function toBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const pad = input.length % 4;
  const normalized = (input + (pad ? '='.repeat(4 - pad) : ''))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function randomChallenge(length = 32): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

export function isBiometricSupported(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && typeof PublicKeyCredential !== 'undefined'
    && !!navigator.credentials;
}

export async function registerBiometricCredential(args: {
  userId: string;
  userName: string;
  displayName: string;
  existingCredentialId?: string;
}): Promise<string> {
  if (!isBiometricSupported()) {
    throw new Error('Biometric authentication is not available on this device/browser.');
  }

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: {
      id: window.location.hostname,
      name: 'UniTrack',
    },
    user: {
      id: textEncoder.encode(args.userId),
      name: args.userName,
      displayName: args.displayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: args.existingCredentialId
      ? [{
          id: fromBase64Url(args.existingCredentialId),
          type: 'public-key',
        }]
      : [],
  };

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
  if (!credential) {
    throw new Error('Biometric enrollment was cancelled.');
  }

  return toBase64Url(credential.rawId);
}

export async function verifyBiometricCredential(credentialId?: string): Promise<void> {
  if (!isBiometricSupported()) {
    throw new Error('Biometric authentication is not available on this device/browser.');
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: credentialId
      ? [{
          id: fromBase64Url(credentialId),
          type: 'public-key',
        }]
      : undefined,
  };

  const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
  if (!assertion) {
    throw new Error('Biometric verification failed or was cancelled.');
  }
}
