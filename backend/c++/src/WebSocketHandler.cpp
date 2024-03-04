// WebSocketHandler.cpp

#include "WebSocketHandler.hpp"
#include <iostream> // Include this for std::cerr

WebSocketSession::WebSocketSession(tcp::socket socket)
    : ws_(std::move(socket)) {
}

void WebSocketSession::run() {
    ws_.async_accept(
        beast::bind_front_handler(
            &WebSocketSession::on_accept,
            shared_from_this()));
}

void WebSocketSession::on_accept(beast::error_code ec) {
    if (ec) return fail(ec, "accept");

    do_read();
}

void WebSocketSession::do_read() {
    ws_.async_read(
        buffer_,
        beast::bind_front_handler(
            &WebSocketSession::on_read,
            shared_from_this()));
}

void WebSocketSession::on_read(beast::error_code ec, std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    if (ec) return fail(ec, "read");

    ws_.text(ws_.got_text());
    ws_.async_write(
        buffer_.data(),
        beast::bind_front_handler(
            &WebSocketSession::on_write,
            shared_from_this()));
}

void WebSocketSession::on_write(beast::error_code ec, std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    if (ec) return fail(ec, "write");

    do_read(); // Read the next message
}

 