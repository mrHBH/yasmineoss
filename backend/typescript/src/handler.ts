
class HttpHandler {
  async handleRequest(request: Request ) {
 
    return new Response("Hello world from Bun! you called from " + request.url  + " with method " + request.method + " and headers " + request.headers.get("User-Agent"));
  }
}

export  { HttpHandler };