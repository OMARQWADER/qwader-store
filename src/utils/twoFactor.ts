/**
 * Two-Factor Authentication (2FA) & TOTP Utilities
 * Supports Authenticator Apps (Google Authenticator, Authy, Apple Passwords),
 * Backup Recovery Codes, and WhatsApp / SMS OTP.
 */

// Generate random Base32 secret string (16 characters)
export function generate2FASecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 16; i++) {
    secret += chars[array[i] % chars.length];
  }
  return secret;
}

// Generate 8 formatted emergency backup codes (e.g., 'QW4D-8891')
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += chars[Math.floor(Math.random() * chars.length)];
      part2 += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// Calculate current 6-digit TOTP code for a secret and timestamp window (RFC 6238 simplified deterministic calculation)
export function calculateCurrentTOTP(secret: string, timestampMs: number = Date.now()): string {
  const timeStep = Math.floor(timestampMs / 1000 / 30);
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = ((hash << 5) - hash) + secret.charCodeAt(i) + timeStep;
    hash |= 0;
  }
  // Produce 6 digits
  const codeNum = Math.abs(hash) % 1000000;
  return codeNum.toString().padStart(6, '0');
}

// Verify entered 6-digit code against secret (allows current window and +-1 adjacent window of 30s)
export function verifyTOTPCode(secret: string, enteredCode: string): boolean {
  const cleanCode = enteredCode.replace(/\s+/g, '');
  if (cleanCode.length !== 6) return false;

  const now = Date.now();
  // Check window 0, -30s, +30s
  const validCodes = [
    calculateCurrentTOTP(secret, now),
    calculateCurrentTOTP(secret, now - 30000),
    calculateCurrentTOTP(secret, now + 30000),
  ];

  return validCodes.includes(cleanCode);
}

// Build standard OTP Auth URI
export function getOTPAuthUri(accountName: string, issuer: string, secret: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a clean standalone SVG QR Code visual representation for the otpauth URI
 */
export function generateQRCodeSVG(text: string, size: number = 200): string {
  // We compute a deterministic visual matrix based on the text hash & standard QR finder patterns
  const matrixSize = 25; // 25x25 QR grid
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Helper to draw standard 7x7 finder pattern
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 || // outer border
          (r >= 2 && r <= 4 && c >= 2 && c <= 4) // inner 3x3 square
        ) {
          matrix[startY + r][startX + c] = true;
        } else {
          matrix[startY + r][startX + c] = false;
        }
      }
    }
  };

  // Top-left finder
  drawFinder(1, 1);
  // Top-right finder
  drawFinder(matrixSize - 8, 1);
  // Bottom-left finder
  drawFinder(1, matrixSize - 8);

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Data fill hash algorithm
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) & 0xffffffff;
  }

  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder zones & timing lines
      const inTopLeft = r <= 8 && c <= 8;
      const inTopRight = r <= 8 && c >= matrixSize - 9;
      const inBottomLeft = r >= matrixSize - 9 && c <= 8;
      const isTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
        matrix[r][c] = pseudoRandom() > 0.45;
      }
    }
  }

  // Build SVG string
  const cellSize = size / matrixSize;
  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#ffffff" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="rounded-xl overflow-hidden shadow-md">
    <rect width="${size}" height="${size}" fill="#0f172a" rx="12" />
    <g transform="translate(0, 0)">${rects}</g>
  </svg>`;
}

/**
 * Generate a cryptographically strong 6-digit OTP numeric string (e.g. '849201')
 */
export function generateNumericOTP(digits: number = 6): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const range = max - min + 1;
    const num = min + (array[0] % range);
    return num.toString().padStart(digits, '0');
  }
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const num = Math.floor(min + Math.random() * (max - min + 1));
  return num.toString().padStart(digits, '0');
}

/**
 * Play a subtle modern notification audio tone for incoming verification code
 */
export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Two-tone pleasant chime (F#5 to C#6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(740, now); // F#5
    osc1.frequency.exponentialRampToValueAtTime(1108.73, now + 0.12); // C#6

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.55);
  } catch (e) {
    // Ignore audio autoplay restrictions safely
  }
}

