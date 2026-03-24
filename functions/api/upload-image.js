export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { base64, userId, fileName } = await request.json();

    if (!base64 || !userId || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Convert base64 to binary
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build S3-compatible request to R2
    const key = `${userId}/${fileName}`;
    const url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`;

    // Sign the request using AWS Signature V4
    const signed = await signR2Request({
      method: 'PUT',
      url,
      body: bytes,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    });

    const uploadResponse = await fetch(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(`R2 upload failed: ${uploadResponse.status} - ${text}`);
    }

    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
    return new Response(JSON.stringify({ publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ── AWS Signature V4 for R2 ───────────────────────────────────────────────
async function signR2Request({ method, url, body, accessKeyId, secretAccessKey, region, service }) {
  const parsedUrl = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const contentHash = await sha256Hex(body);

  const headers = {
    'host': parsedUrl.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': contentHash,
    'content-type': 'image/jpeg',
  };

  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders = sortedHeaders.join(';');

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join('\n');

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  headers['authorization'] = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  return { url, headers };
}

async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key, data) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacBytes(key, data) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function getSigningKey(secret, date, region, service) {
  const kDate = await hmacBytes(new TextEncoder().encode(`AWS4${secret}`), date);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  const kSigning = await hmacBytes(kService, 'aws4_request');
  return kSigning;
}
