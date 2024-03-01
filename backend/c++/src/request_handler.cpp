#include "request_handler.hpp"
#include <iostream>

// Implement the function declared in request_handler.hpp
void handle_request_and_log(const std::string& doc_root,
                            const http::request<http::string_body>& req,
                            std::function<void(http::response<http::string_body>&&)> send) {
    // Log the request
    std::cout << "Received request: " << req << std::endl;

    // Create a simple response
    http::response<http::string_body> res{http::status::ok, req.version()};
    res.set(http::field::server, "Beast");
    res.set(http::field::content_type, "text/plain");
    res.body() = "Hello from C++ world !!!";
    res.prepare_payload();

    // Send the response
    send(std::move(res));
}
