export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '') || url.searchParams.get('path');

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Direct PUT Upload into R2 Bucket
    if (request.method === 'PUT' && path && !path.startsWith('rest/v1') && !path.startsWith('storage/v1')) {
      try {
        const contentType = request.headers.get('content-type') || 'application/octet-stream';
        await env.DEAL_DOCUMENTS.put(path, request.body, {
          httpMetadata: { contentType },
        });

        return new Response(JSON.stringify({
          success: true,
          path,
          publicUrl: 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev/' + path,
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (putErr) {
        return new Response(JSON.stringify({
          error: 'R2 bucket put failed: ' + (putErr?.message || String(putErr)),
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 3. Try Serving from R2 Bucket First (for document binaries)
    if (env.DEAL_DOCUMENTS && path && !path.startsWith('rest/v1') && !path.startsWith('storage/v1') && !path.startsWith('auth/v1') && !path.startsWith('realtime/v1')) {
      const object = await env.DEAL_DOCUMENTS.get(path);
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(object.body, { headers });
      }
    }

    // 4. Supabase proxy. Never share-cache a response whose contents can vary
    // by bearer token (Auth, Realtime, Storage, or RLS-protected PostgREST).
    url.hostname = 'sihpsqrunkwkxhhnwoqe.supabase.co';
    const isRead = request.method === 'GET' || request.method === 'HEAD';
    const isPublicRestRead = isRead
      && path.startsWith('rest/v1')
      && !request.headers.has('authorization');
    
    // Copy headers and set Host to Supabase
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('Host', 'sihpsqrunkwkxhhnwoqe.supabase.co');

    const newReq = new Request(url.toString(), {
      headers: forwardHeaders,
      method: request.method,
      body: isRead ? null : request.body,
    });

    const fetchOptions = isPublicRestRead
      ? { cf: { cacheEverything: true, cacheTtl: 30 } }
      : {};

    const originRes = await fetch(newReq, fetchOptions);
    const responseHeaders = new Headers(originRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    responseHeaders.append('Vary', 'Authorization');
    if (isPublicRestRead && originRes.status === 200) {
      responseHeaders.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59');
    } else if (isRead) {
      responseHeaders.set('Cache-Control', 'private, no-store');
    }

    return new Response(originRes.body, {
      status: originRes.status,
      statusText: originRes.statusText,
      headers: responseHeaders,
    });
  },
};
