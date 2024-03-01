#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <string>

namespace beast = boost::beast; // from <boost/beast/core.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>

// Declare the function for handling requests
void handle_request_and_log(const std::string& doc_root,
                            const http::request<http::string_body>& req,
                            std::function<void(http::response<http::string_body>&&)> send);
