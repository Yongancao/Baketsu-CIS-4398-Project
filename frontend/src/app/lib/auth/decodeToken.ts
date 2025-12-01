export function decodeToken(token: string) {
  try {
    const payloadPart = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payloadPart, "base64").toString());

    // Check expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null; // expired
    }

    return decoded; // contains sub, exp, etc.
  } catch (e) {
    return null; // invalid token
  }
}
